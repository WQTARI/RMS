<?php

namespace App\Events;

use App\Models\OrderItem;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Bus\Queueable;

class OrderItemUpdated implements ShouldBroadcast, ShouldQueue
{
    use Dispatchable, InteractsWithSockets, SerializesModels, Queueable, \App\Traits\SafeBroadcast;

    public function __construct(public OrderItem $orderItem)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('order-items'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'OrderItemUpdated';
    }
}
