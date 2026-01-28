<?php

namespace App\Observers;

use App\Models\TableSection;
use App\Models\SystemAudit;

class TableSectionObserver
{
    public function created(TableSection $tableSection): void
    {
        SystemAudit::create([
            'auditable_type' => TableSection::class,
            'auditable_id' => $tableSection->id,
            'user_id' => auth()->id(),
            'action' => 'CREATED',
            'new_values' => [
                'name' => $tableSection->name,
                'description' => $tableSection->description,
            ],
            'description' => "Table section '{$tableSection->name}' created",
        ]);
    }

    public function updated(TableSection $tableSection): void
    {
        SystemAudit::create([
            'auditable_type' => TableSection::class,
            'auditable_id' => $tableSection->id,
            'user_id' => auth()->id(),
            'action' => 'UPDATED',
            'old_values' => $tableSection->getOriginal(),
            'new_values' => $tableSection->getAttributes(),
            'description' => "Table section '{$tableSection->name}' updated",
        ]);
    }

    public function deleted(TableSection $tableSection): void
    {
        // Cascade soft delete to all tables in this section
        $tableSection->tables()->delete();

        SystemAudit::create([
            'auditable_type' => TableSection::class,
            'auditable_id' => $tableSection->id,
            'user_id' => auth()->id(),
            'action' => 'DELETED',
            'old_values' => [
                'name' => $tableSection->name,
                'description' => $tableSection->description,
            ],
            'description' => "Table section '{$tableSection->name}' deleted (cascaded to tables)",
        ]);
    }
}
