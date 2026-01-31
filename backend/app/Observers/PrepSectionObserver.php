<?php

namespace App\Observers;

use App\Models\PrepSection;
use App\Models\SystemAudit;

class PrepSectionObserver
{
    public function created(PrepSection $prepSection): void
    {
        // 1. Create a Role for this section
        $role = \App\Models\Role::firstOrCreate(
            ['name' => $prepSection->name],
            ['description' => "Automated role for {$prepSection->name} section staff"]
        );

        // 2. Assign basic production permissions (STRICT: No view_only)
        $permissions = \App\Models\Permission::whereIn('name', ['update_item_status'])->pluck('id');
        $role->permissions()->syncWithoutDetaching($permissions);

        SystemAudit::create([
            'auditable_type' => PrepSection::class,
            'auditable_id' => $prepSection->id,
            'user_id' => auth()->id(),
            'action' => 'CREATED',
            'new_values' => [
                'name' => $prepSection->name,
                'automated_role' => $role->name,
            ],
            'description' => "Prep section '{$prepSection->name}' created with automated role '{$role->name}'",
        ]);
    }

    public function updated(PrepSection $prepSection): void
    {
        SystemAudit::create([
            'auditable_type' => PrepSection::class,
            'auditable_id' => $prepSection->id,
            'user_id' => auth()->id(),
            'action' => 'UPDATED',
            'old_values' => $prepSection->getOriginal(),
            'new_values' => $prepSection->getAttributes(),
            'description' => "Prep section '{$prepSection->name}' updated",
        ]);
    }

    public function deleted(PrepSection $prepSection): void
    {
        // 1. Cascade soft delete to all menu items in this section
        $prepSection->menuItems()->delete();

        // We might not want to delete the role if it's being used by others, 
        // but for now, we'll keep it simple and just cleanup the user.

        SystemAudit::create([
            'auditable_type' => PrepSection::class,
            'auditable_id' => $prepSection->id,
            'user_id' => auth()->id(),
            'action' => 'DELETED',
            'old_values' => [
                'name' => $prepSection->name,
            ],
            'description' => "Prep section '{$prepSection->name}' deleted (cascaded to menu items)",
        ]);
    }
}
