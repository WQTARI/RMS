<?php

namespace App\Policies;

use App\Models\Reservation;
use App\Models\User;

class ReservationPolicy
{
    /**
     * Perform pre-authorization checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasPermission('manage_settings')) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasPermission('view_only');
    }

    public function view(User $user, Reservation $reservation): bool
    {
        return $user->hasPermission('view_only');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_reservations');
    }

    public function update(User $user, Reservation $reservation): bool
    {
        return $user->hasPermission('manage_reservations');
    }

    public function delete(User $user, Reservation $reservation): bool
    {
        return $user->hasPermission('manage_reservations');
    }
}
