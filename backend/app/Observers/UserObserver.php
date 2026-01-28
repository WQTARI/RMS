<?php

namespace App\Observers;

use App\Models\User;
use App\Models\SystemAudit;

class UserObserver
{
    public function created(User $user): void
    {
        SystemAudit::create([
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'user_id' => auth()->id(),
            'action' => 'CREATED',
            'new_values' => [
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name')->toArray(),
            ],
            'description' => "User '{$user->name}' created",
        ]);
    }

    public function updated(User $user): void
    {
        SystemAudit::create([
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'user_id' => auth()->id(),
            'action' => 'UPDATED',
            'old_values' => $user->getOriginal(),
            'new_values' => $user->getAttributes(),
            'description' => "User '{$user->name}' updated",
        ]);
    }

    public function deleted(User $user): void
    {
        SystemAudit::create([
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'user_id' => auth()->id(),
            'action' => 'DELETED',
            'old_values' => [
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name')->toArray(),
            ],
            'description' => "User '{$user->name}' deleted",
        ]);
    }
}
