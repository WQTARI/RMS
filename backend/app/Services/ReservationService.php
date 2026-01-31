<?php

namespace App\Services;

use App\Enums\ReservationStatus;
use App\Enums\OrderStatus;
use App\Enums\InvoiceStatus;
use App\Models\Reservation;
use App\Models\RestaurantTable;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReservationService
{
    public function hasOverlap(
        int $tableId,
        Carbon $start,
        int $durationMinutes,
        bool $forUpdate = false,
        ?int $excludeReservationId = null
    ): bool {
        $duration = $durationMinutes > 0 ? $durationMinutes : 180;
        $end = $start->copy()->addMinutes($duration);

        $reservations = Reservation::query()
            ->where('table_id', $tableId)
            ->whereIn('status', [ReservationStatus::Created, ReservationStatus::Arrived, ReservationStatus::Seated])
            ->where('date_time', '<', $end)
            ->when($excludeReservationId, fn($query) => $query->where('id', '!=', $excludeReservationId))
            ->when($forUpdate, fn($query) => $query->lockForUpdate())
            ->get();

        return $reservations->contains(function (Reservation $reservation) use ($start, $end) {
            $reservationStart = Carbon::parse($reservation->date_time);
            $duration = $reservation->duration_minutes > 0 ? $reservation->duration_minutes : 180;
            $reservationEnd = $reservationStart->copy()->addMinutes($duration);

            return $reservationStart < $end && $start < $reservationEnd;
        });
    }

    public function createReservation(array $data): Reservation
    {
        return DB::transaction(function () use ($data) {
            $start = Carbon::parse($data['date_time']);
            $duration = (int) ($data['duration_minutes'] ?? 90);

            if ($start->lt(now()->subMinutes(10))) {
                throw ValidationException::withMessages([
                    'date_time' => 'Reservation date/time cannot be more than 10 minutes in the past.',
                ]);
            }

            if ($this->isTableOccupiedNow((int) $data['table_id']) && $start->lessThanOrEqualTo(now())) {
                throw ValidationException::withMessages([
                    'table_id' => 'Table is currently occupied.',
                ]);
            }

            if ($this->hasOverlap((int) $data['table_id'], $start, $duration, true)) {
                throw ValidationException::withMessages([
                    'date_time' => 'Reservation overlaps existing booking',
                ]);
            }

            return Reservation::create($data);
        });
    }

    public function assertNoOverlapForUpdate(
        int $reservationId,
        int $tableId,
        Carbon $start,
        int $durationMinutes
    ): void {
        if ($start->lt(now()->subMinutes(10))) {
            throw ValidationException::withMessages([
                'date_time' => 'Reservation date/time cannot be more than 10 minutes in the past.',
            ]);
        }

        if ($this->isTableOccupiedNow($tableId) && $start->lessThanOrEqualTo(now())) {
            throw ValidationException::withMessages([
                'table_id' => 'Table is currently occupied.',
            ]);
        }

        if ($this->hasOverlap($tableId, $start, $durationMinutes, true, $reservationId)) {
            throw ValidationException::withMessages([
                'date_time' => 'Reservation overlaps existing booking',
            ]);
        }
    }

    protected function isTableOccupiedNow(int $tableId): bool
    {
        $table = RestaurantTable::query()
            ->with(['orders', 'invoices', 'reservations'])
            ->find($tableId);

        if (!$table) {
            return false;
        }

        $hasOpenOrder = $table->orders()
            ->whereIn('status', [OrderStatus::Open, OrderStatus::InProgress, OrderStatus::Ready])
            ->exists();

        $hasOpenInvoice = $table->invoices()
            ->where('status', InvoiceStatus::Open)
            ->exists();

        if ($hasOpenOrder || $hasOpenInvoice) {
            return true;
        }

        $now = Carbon::now();
        return $table->reservations()
            ->whereIn('status', [ReservationStatus::Created, ReservationStatus::Arrived, ReservationStatus::Seated])
            ->where('date_time', '<=', $now)
            ->get()
            ->contains(function (Reservation $reservation) use ($now) {
                $duration = $reservation->duration_minutes > 0 ? $reservation->duration_minutes : 180;
                $end = Carbon::parse($reservation->date_time)->addMinutes($duration);
                return $now->lessThan($end);
            });
    }
}
