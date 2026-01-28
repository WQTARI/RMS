<?php

namespace App\Policies;

use App\Models\RestaurantTable;
use App\Models\User;

class RestaurantTablePolicy
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

    public function view(User $user, RestaurantTable $table): bool
    {
        return $user->hasPermission('view_only');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_settings');
    }

    public function update(User $user, RestaurantTable $table): bool
    {
        // Reception can update table status (e.g., set to occupied/available) 
        // through reservations or floor plan, but CRUD is admin only.
        return $user->hasPermission('manage_settings') || $user->hasPermission('manage_reservations');
    }

    public function delete(User $user, RestaurantTable $table): bool
    {
        return $user->hasPermission('manage_settings');
    }
}
