<?php

namespace App\Policies;

use App\Models\TableSection;
use App\Models\User;

class TableSectionPolicy
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

    public function view(User $user, TableSection $section): bool
    {
        return $user->hasPermission('view_only');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_settings');
    }

    public function update(User $user, TableSection $section): bool
    {
        return $user->hasPermission('manage_settings');
    }

    public function delete(User $user, TableSection $section): bool
    {
        return $user->hasPermission('manage_settings');
    }
}
