<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
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
        return $user->hasPermission('manage_settings');
    }

    public function view(User $user, User $model): bool
    {
        return $user->hasPermission('manage_settings');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_settings');
    }

    public function update(User $user, User $model): bool
    {
        return $user->hasPermission('manage_settings');
    }

    public function delete(User $user, User $model): bool
    {
        return $user->hasPermission('manage_settings');
    }
}
