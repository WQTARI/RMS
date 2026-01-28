<?php

namespace App\Observers;

use App\Models\MenuItem;
use App\Models\SystemAudit;

class MenuItemObserver
{
    public function created(MenuItem $menuItem): void
    {
        SystemAudit::create([
            'auditable_type' => MenuItem::class,
            'auditable_id' => $menuItem->id,
            'user_id' => auth()->id(),
            'action' => 'CREATED',
            'new_values' => [
                'name' => $menuItem->name,
                'price' => $menuItem->price,
                'category' => $menuItem->category,
                'prep_section' => $menuItem->prepSection?->name,
            ],
            'description' => "Menu item '{$menuItem->name}' created",
        ]);
    }

    public function updated(MenuItem $menuItem): void
    {
        SystemAudit::create([
            'auditable_type' => MenuItem::class,
            'auditable_id' => $menuItem->id,
            'user_id' => auth()->id(),
            'action' => 'UPDATED',
            'old_values' => $menuItem->getOriginal(),
            'new_values' => $menuItem->getAttributes(),
            'description' => "Menu item '{$menuItem->name}' updated",
        ]);
    }

    public function deleted(MenuItem $menuItem): void
    {
        SystemAudit::create([
            'auditable_type' => MenuItem::class,
            'auditable_id' => $menuItem->id,
            'user_id' => auth()->id(),
            'action' => 'DELETED',
            'old_values' => [
                'name' => $menuItem->name,
                'price' => $menuItem->price,
                'category' => $menuItem->category,
            ],
            'description' => "Menu item '{$menuItem->name}' deleted",
        ]);
    }
}
