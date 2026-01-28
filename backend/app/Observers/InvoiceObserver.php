<?php

namespace App\Observers;

use App\Models\Invoice;
use App\Services\TableStatusService;

class InvoiceObserver
{
    public function __construct(protected TableStatusService $tableStatusService)
    {
    }

    /**
     * Handle the Invoice "saved" event.
     */
    public function saved(Invoice $invoice): void
    {
        if ($invoice->table) {
            $this->tableStatusService->updateStatus($invoice->table);
        }
    }

    /**
     * Handle the Invoice "deleted" event.
     */
    public function deleted(Invoice $invoice): void
    {
        if ($invoice->table) {
            $this->tableStatusService->updateStatus($invoice->table);
        }
    }
}
