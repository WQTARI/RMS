<?php

namespace App\Services;

use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Enums\ReservationStatus;
use App\Events\OrderCreated;
use App\Events\OrderItemUpdated;
use App\Events\OrderRegressedToInProgress;
use App\Models\Invoice;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderAudit;
use App\Models\OrderItem;
use App\Models\Reservation;
use App\Models\User;
use App\Services\ReportCacheService;
use App\Services\InvoiceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderService
{
    public function createOrder(array $payload): Order
    {
        return DB::transaction(function () use ($payload) {
            $tableId = isset($payload['table_id']) ? (int) $payload['table_id'] : null;

            if (isset($payload['invoice_id'])) {
                $invoice = Invoice::findOrFail($payload['invoice_id']);
            } else {
                $invoice = app(InvoiceService::class)->openInvoice($tableId, $payload['customer_name'] ?? null);
            }

            $order = Order::create([
                'table_id' => $tableId,
                'reservation_id' => $payload['reservation_id'] ?? null,
                'invoice_id' => $invoice->id,
                'created_by' => $payload['created_by'] ?? null,
                'notes' => $payload['notes'] ?? null,
                'status' => OrderStatus::Open,
                'started_at' => now(),
            ]);

            $this->updateOrderItems($order, $payload['items'] ?? [], $payload['created_by'] ?? null);

            if (!empty($payload['reservation_id'])) {
                $reservation = Reservation::find($payload['reservation_id']);
                Reservation::whereKey($payload['reservation_id'])
                    ->update(['status' => ReservationStatus::Seated]);
                // Convert at or after reservation time = customer arrived; make immediately kitchen-visible.
                if ($reservation && Carbon::parse($reservation->date_time)->lessThanOrEqualTo(now())) {
                    $order->update(['confirmed_at' => now()]);
                }
            } else {
                // POS orders (no reservation) are immediate.
                $order->update(['confirmed_at' => now()]);
            }

            // Sync invoice total immediately
            $this->syncInvoiceTotal($order->invoice_id);

            $this->auditOrderMutation(
                $order,
                'order_created',
                [],
                $this->snapshotItems($order->items),
                $payload['created_by'] ?? null,
                null,
                OrderStatus::Open->value,
                'New order initiated'
            );

            \App\Events\OrderCreated::dispatchSafe($order->load('items'));

            if ($order->confirmed_at) {
                $this->dispatchProductionTickets($order);
            }

            if ($order->table) {
                app(TableStatusService::class)->updateStatus($order->table);
            }

            return $order->refresh();
        });
    }

    public function updateOrderItems(Order $order, array $items, ?int $actorId = null): Order
    {
        return DB::transaction(function () use ($order, $items, $actorId) {
            $order->loadMissing('items.menuItem');
            $beforeSnapshot = $this->snapshotItems($order->items);
            $wasReady = $order->status === OrderStatus::Ready;

            if ($wasReady) {
                // Explicitly regress READY orders when modifying items.
                Order::allowStatusWrite(fn() => $order->update(['status' => OrderStatus::InProgress]));
                \App\Events\OrderRegressedToInProgress::dispatchSafe($order->fresh('items'));
                $this->auditOrderMutation(
                    $order,
                    'order_regressed_to_in_progress',
                    $beforeSnapshot,
                    $beforeSnapshot,
                    $actorId,
                    OrderStatus::Ready->value,
                    OrderStatus::InProgress->value,
                    'Order modified after it was READY'
                );
            }

            $modifiedItemIds = [];
            foreach ($items as $itemData) {
                if (isset($itemData['id'])) {
                    // Update existing item
                    $orderItem = $order->items->find($itemData['id']);
                    if ($orderItem) {
                        if (isset($itemData['quantity']) && $itemData['quantity'] <= 0) {
                            $orderItem->update(['status' => OrderItemStatus::Cancelled]);
                        } else {
                            $orderItem->update(array_filter([
                                'quantity' => $itemData['quantity'] ?? $orderItem->quantity,
                                'notes' => $itemData['notes'] ?? $orderItem->notes,
                            ]));
                        }
                        $modifiedItemIds[] = $orderItem->id;
                    }
                } else {
                    // Add new item
                    $menuItem = MenuItem::findOrFail($itemData['menu_item_id']);
                    $orderItem = OrderItem::create([
                        'order_id' => $order->id,
                        'menu_item_id' => $menuItem->id,
                        'prep_section_id' => $menuItem->prep_section_id,
                        'quantity' => $itemData['quantity'],
                        'price' => $menuItem->price,
                        'notes' => $itemData['notes'] ?? null,
                    ]);
                    $modifiedItemIds[] = $orderItem->id;
                }
            }

            $order->load('items');
            $order->syncStatusFromItems();
            $this->syncInvoiceTotal($order->invoice_id);
            app(ReportCacheService::class)->clearSalesAggregates();

            $afterSnapshot = $this->snapshotItems($order->items);
            $this->auditOrderMutation(
                $order,
                'order_items_updated',
                $beforeSnapshot,
                $afterSnapshot,
                $actorId,
                null,
                null,
                'Batch update of order items'
            );

            if ($order->confirmed_at) {
                $this->dispatchProductionTickets($order, $modifiedItemIds);
            }

            return $order->refresh();
        });
    }

    public function updateItemStatus(OrderItem $orderItem, OrderItemStatus $nextStatus): OrderItem
    {
        return DB::transaction(function () use ($orderItem, $nextStatus) {
            $orderItem->loadMissing('prepSection');

            $orderItem->assertCanTransitionTo($nextStatus);
            $orderItem->update(['status' => $nextStatus]);
            if ($order = $orderItem->order) {
                $order->unsetRelation('items');
                $order->load('items');
                $order->syncStatusFromItems();
                $this->syncInvoiceTotal($order->invoice_id);
            }

            app(ReportCacheService::class)->clearSalesAggregates();

            return $orderItem->refresh();
        });
    }

    protected function snapshotItems($items): array
    {
        return $items->map(fn(OrderItem $item) => [
            'id' => $item->id,
            'menu_item_id' => $item->menu_item_id,
            'quantity' => $item->quantity,
            'status' => $item->status?->value,
            'notes' => $item->notes,
        ])->values()->all();
    }

    protected function auditOrderMutation(
        Order $order,
        string $action,
        array $before,
        array $after,
        ?int $actorId,
        ?string $previousStatus = null,
        ?string $newStatus = null,
        ?string $reason = null
    ): void {
        Log::info('order.audit', [
            'order_id' => $order->id,
            'user_id' => $actorId,
            'action' => $action,
            'before' => $before,
            'after' => $after,
            'occurred_at' => now()->toISOString(),
        ]);

        OrderAudit::create([
            'order_id' => $order->id,
            'user_id' => $actorId && User::whereKey($actorId)->exists() ? $actorId : null,
            'action' => $action,
            'previous_status' => $previousStatus,
            'new_status' => $newStatus,
            'reason' => $reason,
            'before_snapshot' => $before,
            'after_snapshot' => $after,
            'occurred_at' => now(),
        ]);
    }

    public function syncInvoiceTotal(?int $invoiceId): void
    {
        if (!$invoiceId) {
            return;
        }

        try {
            $invoice = Invoice::with('orders.items')->find($invoiceId);
            if (!$invoice) {
                return;
            }

            // Calculate subtotal from all order items
            $subtotal = 0;
            foreach ($invoice->orders as $order) {
                foreach ($order->items as $item) {
                    $subtotal += $item->price * $item->quantity;
                }
            }

            $invoice->update([
                'subtotal' => $subtotal,
                'total' => max(0, ($subtotal + $invoice->tax) - $invoice->discount),
            ]);
        } catch (\Exception $e) {
            // Log but don't fail the order creation
            \Log::warning('Failed to sync invoice total', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Group items by section and dispatch broadcast events.
     */
    public function dispatchProductionTickets(Order $order, ?array $onlyItemIds = null): void
    {
        if (!$order->confirmed_at || $order->status === OrderStatus::Cancelled) {
            return;
        }

        $itemsQuery = $order->items();
        if ($onlyItemIds) {
            $itemsQuery->whereIn('id', $onlyItemIds);
        }

        $itemsBySection = $itemsQuery->get()->groupBy('prep_section_id');

        foreach ($itemsBySection as $sectionId => $items) {
            if ($sectionId) {
                \App\Events\ProductionTicketDispatched::dispatchSafe($order, $items, $sectionId);
            }
        }
    }

    public function cancelOrder(Order $order, ?int $actorId = null): Order
    {
        return DB::transaction(function () use ($order, $actorId) {
            $order->loadMissing('items');
            $previousStatus = $order->status->value;
            $beforeSnapshot = $this->snapshotItems($order->items);

            // Mark all items as cancelled
            foreach ($order->items as $item) {
                $item->update(['status' => OrderItemStatus::Cancelled]);
            }

            // Mark order as cancelled
            Order::allowStatusWrite(fn() => $order->update(['status' => OrderStatus::Cancelled]));

            $this->auditOrderMutation(
                $order,
                'order_cancelled',
                $beforeSnapshot,
                $this->snapshotItems($order->items),
                $actorId,
                $previousStatus,
                OrderStatus::Cancelled->value,
                'Order cancelled by user'
            );

            // Sync invoice total
            $this->syncInvoiceTotal($order->invoice_id);

            // If it's a takeaway (no table) and the only order on the invoice, cancel the invoice too?
            // Actually, syncInvoiceTotal handles setting total to 0 if no active items.
            // But let's check if the invoice should be cancelled.
            $invoice = $order->invoice;
            if ($invoice && $invoice->orders()->where('status', '!=', OrderStatus::Cancelled)->count() === 0) {
                $invoice->update(['status' => \App\Enums\InvoiceStatus::Cancelled]);
            }

            if ($order->table) {
                app(TableStatusService::class)->updateStatus($order->table);
            }

            app(ReportCacheService::class)->clearSalesAggregates();

            event(new \App\Events\OrderStatusUpdated($order->fresh()));

            return $order->refresh();
        });
    }
}
