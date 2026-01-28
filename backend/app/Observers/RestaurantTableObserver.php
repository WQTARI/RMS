<?php

namespace App\Observers;

use App\Models\RestaurantTable;
use App\Models\SystemAudit;

class RestaurantTableObserver
{
    public function created(RestaurantTable $table): void
    {
        SystemAudit::create([
            'auditable_type' => RestaurantTable::class,
            'auditable_id' => $table->id,
            'user_id' => auth()->id(),
            'action' => 'CREATED',
            'new_values' => [
                'name' => $table->name,
                'capacity' => $table->capacity,
                'section' => $table->section?->name,
            ],
            'description' => "Table '{$table->name}' created",
        ]);
    }

    public function updated(RestaurantTable $table): void
    {
        SystemAudit::create([
            'auditable_type' => RestaurantTable::class,
            'auditable_id' => $table->id,
            'user_id' => auth()->id(),
            'action' => 'UPDATED',
            'old_values' => $table->getOriginal(),
            'new_values' => $table->getAttributes(),
            'description' => "Table '{$table->name}' updated",
        ]);
    }

    public function deleted(RestaurantTable $table): void
    {
        SystemAudit::create([
            'auditable_type' => RestaurantTable::class,
            'auditable_id' => $table->id,
            'user_id' => auth()->id(),
            'action' => 'DELETED',
            'old_values' => [
                'name' => $table->name,
                'capacity' => $table->capacity,
                'section' => $table->section?->name,
            ],
            'description' => "Table '{$table->name}' deleted",
        ]);
    }
}
