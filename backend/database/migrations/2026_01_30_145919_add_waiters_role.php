<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $role = \App\Models\Role::updateOrCreate(
            ['name' => 'Waiters'],
            ['description' => 'Waiter role with access to aggregated order views']
        );

        $permissions = \App\Models\Permission::whereIn('name', [
            'view_only',
            'create_order',
            'update_item_status'
        ])->get();

        $role->permissions()->sync($permissions->pluck('id'));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $role = \App\Models\Role::where('name', 'Waiters')->first();
        if ($role) {
            $role->permissions()->detach();
            $role->delete();
        }
    }
};
