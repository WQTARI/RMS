<?php

namespace App\Observers;

use App\Models\PrepSection;
use App\Models\SystemAudit;

class PrepSectionObserver
{
    public function created(PrepSection $prepSection): void
    {
        SystemAudit::create([
            'auditable_type' => PrepSection::class,
            'auditable_id' => $prepSection->id,
            'user_id' => auth()->id(),
            'action' => 'CREATED',
            'new_values' => [
                'name' => $prepSection->name,
                'description' => $prepSection->description,
            ],
            'description' => "Prep section '{$prepSection->name}' created",
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
        // Cascade soft delete to all menu items in this section
        $prepSection->menuItems()->delete();

        SystemAudit::create([
            'auditable_type' => PrepSection::class,
            'auditable_id' => $prepSection->id,
            'user_id' => auth()->id(),
            'action' => 'DELETED',
            'old_values' => [
                'name' => $prepSection->name,
                'description' => $prepSection->description,
            ],
            'description' => "Prep section '{$prepSection->name}' deleted (cascaded to menu items)",
        ]);
    }
}
