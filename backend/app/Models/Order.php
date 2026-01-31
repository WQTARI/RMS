<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use LogicException;

/**
 * Order is the aggregate root for kitchen and billing workflows.
 *
 * Status is derived from OrderItems and cannot be set manually.
 * Kitchen visibility is time-based for pre-orders, with confirmed_at as a manual override.
 */
class Order extends Model
{
    use HasFactory;

    protected static bool $statusWriteAllowed = false;

    protected $fillable = [
        'table_id',
        'reservation_id',
        'invoice_id',
        'created_by',
        'status',
        'started_at',
        'confirmed_at',
        'closed_at',
        'notes',
    ];

    protected $casts = [
        'status' => OrderStatus::class,
        'started_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    protected $appends = ['customer_name'];

    /**
     * Get the customer name for this order.
     * Prioritizes invoice name (most up-to-date), then falls back to reservation name.
     */
    public function getCustomerNameAttribute(): ?string
    {
        // 1. Check associated invoice (where name is persisted for takeaways/dine-in)
        if ($this->invoice && $this->invoice->customer_name) {
            return $this->invoice->customer_name;
        }

        // 2. Fallback to reservation (if dine-in with booking)
        if ($this->reservation && $this->reservation->customer_name) {
            return $this->reservation->customer_name;
        }

        return null;
    }

    public function setStatusAttribute(mixed $value): void
    {
        $status = $value instanceof OrderStatus ? $value : OrderStatus::from($value);

        if ($this->exists && $status === OrderStatus::Closed) {
            $invoiceStatus = $this->invoice?->status;
            if (!$invoiceStatus && $this->invoice_id) {
                $rawStatus = Invoice::whereKey($this->invoice_id)->value('status');
                $invoiceStatus = $rawStatus ? InvoiceStatus::from($rawStatus) : null;
            }

            if ($invoiceStatus !== InvoiceStatus::Paid) {
                throw ValidationException::withMessages([
                    'status' => 'Order cannot be closed unless invoice is paid.',
                ]);
            }
        }

        $this->attributes['status'] = $status->value;
    }

    protected static function booted(): void
    {
        static::saving(function (Order $order) {
            if ($order->exists && $order->isDirty('status') && !self::$statusWriteAllowed) {
                throw ValidationException::withMessages([
                    'status' => 'Order status is derived and cannot be set manually.',
                ]);
            }

            if ($order->isDirty('status') && $order->status === OrderStatus::Closed) {
                $invoiceStatus = $order->invoice?->status;
                if (!$invoiceStatus && $order->invoice_id) {
                    $rawStatus = Invoice::whereKey($order->invoice_id)->value('status');
                    $invoiceStatus = $rawStatus ? InvoiceStatus::from($rawStatus) : null;
                }

                if ($invoiceStatus !== InvoiceStatus::Paid) {
                    throw ValidationException::withMessages([
                        'status' => 'Order cannot be closed unless invoice is paid.',
                    ]);
                }
            }
        });
    }

    public function refresh(): static
    {
        parent::refresh();

        $this->loadMissing(['items.menuItem', 'reservation']);

        return $this;
    }

    public static function allowStatusWrite(callable $callback): mixed
    {
        self::$statusWriteAllowed = true;
        try {
            return $callback();
        } finally {
            self::$statusWriteAllowed = false;
        }
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function audits(): HasMany
    {
        return $this->hasMany(OrderAudit::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function kitchenVisibleAt(): ?Carbon
    {
        if (!$this->reservation) {
            return $this->started_at ?? $this->created_at;
        }

        $this->assertRelationLoaded('items');
        $this->assertMenuItemsLoaded();

        // Pre-orders appear in the kitchen only when prep should start.
        $maxPrep = $this->items
            ->map(fn(OrderItem $item) => $item->menuItem?->prep_time_minutes)
            ->filter()
            ->max();

        if (!$maxPrep) {
            return Carbon::parse($this->reservation->date_time);
        }

        return Carbon::parse($this->reservation->date_time)->subMinutes((int) $maxPrep);
    }

    public function isKitchenVisible(?Carbon $now = null): bool
    {
        if ($this->confirmed_at) {
            return true;
        }

        $visibleAt = $this->kitchenVisibleAt();
        if (!$visibleAt) {
            return true;
        }

        return ($now ?? Carbon::now())->greaterThanOrEqualTo($visibleAt);
    }

    public function deriveStatusFromItems(?Collection $items = null): OrderStatus
    {
        if (!$items) {
            $this->assertRelationLoaded('items');
        }

        $items = $items ?? $this->items;
        if ($items->isEmpty()) {
            return OrderStatus::Open;
        }

        $statuses = $items->pluck('status');
        if ($statuses->every(fn(OrderItemStatus $status) => $status === OrderItemStatus::Pending)) {
            return OrderStatus::Open;
        }

        if (
            $statuses->every(
                fn(OrderItemStatus $status) =>
                $status === OrderItemStatus::Ready || $status === OrderItemStatus::Served
            )
        ) {
            return OrderStatus::Ready;
        }

        return OrderStatus::InProgress;
    }

    public function syncStatusFromItems(?Collection $items = null): void
    {
        if ($this->status === OrderStatus::Closed) {
            return;
        }

        if (!$items) {
            $this->assertRelationLoaded('items');
        }

        $nextStatus = $this->deriveStatusFromItems($items);
        if ($this->status !== $nextStatus) {
            self::allowStatusWrite(fn() => $this->update(['status' => $nextStatus]));
            event(new \App\Events\OrderStatusUpdated($this->fresh()));
        }
    }

    protected function assertRelationLoaded(string $relation): void
    {
        if (!$this->relationLoaded($relation)) {
            throw new LogicException("Order relation '{$relation}' must be loaded before calling this method.");
        }
    }

    protected function assertMenuItemsLoaded(): void
    {
        if ($this->items->isEmpty()) {
            return;
        }

        $missing = $this->items->contains(fn(OrderItem $item) => !$item->relationLoaded('menuItem'));
        if ($missing) {
            throw new LogicException("Order relation 'items.menuItem' must be loaded before calling this method.");
        }
    }
}
