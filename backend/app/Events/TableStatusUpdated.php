<?php

namespace App\Events;

use App\Models\RestaurantTable;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Bus\Queueable;

class TableStatusUpdated implements ShouldBroadcast, ShouldQueue
{
    use Dispatchable, InteractsWithSockets, SerializesModels, Queueable, \App\Traits\SafeBroadcast;

    public function __construct(public RestaurantTable $table)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tables'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'TableStatusUpdated';
    }
}
