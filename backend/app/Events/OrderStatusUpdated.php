<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Order $order;

    public function __construct(Order $order)
    {
        $this->order = $order->loadMissing(['items.menuItem', 'table.section']);
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('orders'),
            new Channel("table.{$this->order->table_id}"),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'order' => $this->order->toArray(),
        ];
    }

    /**
     * Safely dispatch event with error handling.
     */
    public static function dispatchSafe(Order $order): void
    {
        try {
            static::dispatch($order);
        } catch (\Throwable $e) {
            \App\Services\StructuredLogger::error($e, [
                'event' => 'OrderStatusUpdated',
                'order_id' => $order->id,
            ]);
        }
    }
}
