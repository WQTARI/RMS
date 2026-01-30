<?php

namespace App\Models;

use App\Enums\OrderItemStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Validation\ValidationException;

/**
 * OrderItem represents a single menu item line in a kitchen workflow.
 *
 * Status transitions are validated to enforce the kitchen pipeline:
 * PENDING -> IN_PROGRESS -> READY -> SERVED (optional).
 * READY is the terminal kitchen state; SERVED is optional and not required.
 */
class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'menu_item_id',
        'prep_section_id',
        'quantity',
        'price',
        'status',
        'notes',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'status' => OrderItemStatus::class,
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }

    public function prepSection(): BelongsTo
    {
        return $this->belongsTo(PrepSection::class);
    }

    public function canTransitionTo(OrderItemStatus $next): bool
    {
        if ($this->status === $next) {
            return true;
        }

        $transitions = [
            OrderItemStatus::Pending->value => [OrderItemStatus::InProgress, OrderItemStatus::Cancelled],
            OrderItemStatus::InProgress->value => [OrderItemStatus::Ready, OrderItemStatus::Cancelled],
            OrderItemStatus::Ready->value => [OrderItemStatus::Served, OrderItemStatus::Cancelled],
            OrderItemStatus::Served->value => [],
            OrderItemStatus::Cancelled->value => [],
        ];

        return in_array($next, $transitions[$this->status->value] ?? [], true);
    }

    public function assertCanTransitionTo(OrderItemStatus $next): void
    {
        if (!$this->canTransitionTo($next)) {
            throw ValidationException::withMessages([
                'status' => "Invalid transition from {$this->status->value} to {$next->value}.",
            ]);
        }
    }

    public function isAtLeastInProgress(): bool
    {
        return in_array($this->status, [
            OrderItemStatus::InProgress,
            OrderItemStatus::Ready,
            OrderItemStatus::Served,
        ], true);
    }
}
