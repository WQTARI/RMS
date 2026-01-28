<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Bus\Queueable;
use Illuminate\Support\Collection;

class ProductionTicketDispatched implements ShouldBroadcast, ShouldQueue
{
    use Dispatchable, InteractsWithSockets, SerializesModels, Queueable, \App\Traits\SafeBroadcast;

    /**
     * @param Order $order
     * @param Collection $items Filtered items for the specific section
     * @param int $prepSectionId
     */
    public function __construct(
        public Order $order,
        public Collection $items,
        public int $prepSectionId
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('prep-sections.' . $this->prepSectionId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ProductionTicketDispatched';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'order' => $this->order->load(['table.section', 'reservation']),
            'items' => $this->items->map(function ($item) {
                return $item->load('menuItem');
            }),
            'prep_section_id' => $this->prepSectionId,
        ];
    }
}
