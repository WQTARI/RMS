<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\OrderStatus;
use App\Enums\ReservationStatus;
use App\Enums\TableStatus;
use App\Events\TableStatusUpdated;
use App\Models\RestaurantTable;
use Carbon\Carbon;

class TableStatusService
{
    public function updateStatus(RestaurantTable $table): RestaurantTable
    {
        $now = Carbon::now();

        $hasOpenOrder = $table->orders()
            ->whereIn('status', [OrderStatus::Open, OrderStatus::InProgress, OrderStatus::Ready])
            ->exists();

        $hasOpenInvoice = $table->invoices()
            ->where('status', InvoiceStatus::Open)
            ->exists();

        $activeReservations = $table->reservations()
            ->whereIn('status', [ReservationStatus::Created, ReservationStatus::Arrived, ReservationStatus::Seated])
            ->orderBy('date_time')
            ->get();

        $hasCurrentReservation = $activeReservations->contains(function ($reservation) use ($now) {
            $start = Carbon::parse($reservation->date_time);
            $duration = $reservation->duration_minutes > 0 ? $reservation->duration_minutes : 180;
            $end = $start->copy()->addMinutes($duration);
            return $start->lessThanOrEqualTo($now) && $now->lessThan($end);
        });

        $hasUpcomingReservation = $activeReservations->contains(function ($reservation) use ($now) {
            $start = Carbon::parse($reservation->date_time);
            return $start->greaterThan($now);
        });

        if ($hasOpenOrder || $hasOpenInvoice) {
            $table->status = TableStatus::Occupied;
        } elseif ($hasCurrentReservation) {
            $table->status = TableStatus::Reserved;
        } else {
            $table->status = TableStatus::Available;
        }

        $table->save();

        \App\Events\TableStatusUpdated::dispatchSafe($table);

        return $table;
    }
}
