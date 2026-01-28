<?php

namespace App\Observers;

use App\Models\Order;
use App\Services\TableStatusService;

class OrderObserver
{
    public function __construct(protected TableStatusService $tableStatusService)
    {
    }

    /**
     * Handle the Order "saved" event.
     */
    public function saved(Order $order): void
    {
        if ($order->table) {
            $this->tableStatusService->updateStatus($order->table);
        }
    }

    /**
     * Handle the Order "deleted" event.
     */
    public function deleted(Order $order): void
    {
        if ($order->table) {
            $this->tableStatusService->updateStatus($order->table);
        }
    }
}
