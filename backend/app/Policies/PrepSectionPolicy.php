<?php

namespace App\Policies;

use App\Models\PrepSection;
use App\Models\User;

class PrepSectionPolicy
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

    public function view(User $user, PrepSection $section): bool
    {
        return $user->hasPermission('view_only');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_settings');
    }

    public function update(User $user, PrepSection $section): bool
    {
        return $user->hasPermission('manage_settings');
    }

    public function delete(User $user, PrepSection $section): bool
    {
        return $user->hasPermission('manage_settings');
    }
}
