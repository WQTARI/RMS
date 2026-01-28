<?php

namespace App\Observers;

use App\Models\Reservation;
use App\Services\TableStatusService;

class ReservationObserver
{
    public function __construct(protected TableStatusService $tableStatusService)
    {
    }

    /**
     * Handle the Reservation "saved" event.
     */
    public function saved(Reservation $reservation): void
    {
        if ($reservation->table) {
            $this->tableStatusService->updateStatus($reservation->table);
        }
        event(new \App\Events\ReservationUpdated($reservation));
    }

    /**
     * Handle the Reservation "deleted" event.
     */
    public function deleted(Reservation $reservation): void
    {
        if ($reservation->table) {
            $this->tableStatusService->updateStatus($reservation->table);
        }
        event(new \App\Events\ReservationUpdated($reservation));
    }
}
