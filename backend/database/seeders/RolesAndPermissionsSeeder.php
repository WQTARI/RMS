<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            'view_only' => 'Read-only access.',
            'create_order' => 'Create new orders.',
            'modify_order_content' => 'Add or remove items from orders.',
            'update_item_status' => 'Update preparation status of items.',
            'manage_reservations' => 'Create, update and delete reservations.',
            'close_invoice' => 'Close and settle invoices.',
            'view_reports' => 'View sales and performance reports.',
            'manage_settings' => 'Manage system settings.',
            'manage_menu' => 'Manage menu items and categories.',
            'manage_sections' => 'Manage table and prep sections.',
            'manage_users' => 'Manage system users and roles.',
            'serve_items' => 'Mark items as served (Waiter action).',
        ];

        $permissionModels = [];
        foreach ($permissions as $name => $description) {
            $permissionModels[$name] = Permission::updateOrCreate(
                ['name' => $name],
                ['description' => $description]
            );
        }

        $roles = [
            'Admin' => [
                'view_only',
                'create_order',
                'modify_order_content',
                'update_item_status',
                'manage_reservations',
                'close_invoice',
                'view_reports',
                'manage_settings',
                'manage_menu',
                'manage_sections',
                'manage_users',
                'serve_items',
            ],
            'Cashier' => [
                'view_only',
                'create_order',
                'modify_order_content',
                'close_invoice',
            ],
            'Reception' => [
                'view_only',
                'manage_reservations',
            ],
            'Kitchen' => [
                'view_only',
                'update_item_status',
            ],
            'Desserts' => [
                'view_only',
                'update_item_status',
            ],
            'Drinks' => [
                'view_only',
                'update_item_status',
            ],
            'Waiters' => [
                'view_only',
                'serve_items',
            ],
        ];

        foreach ($roles as $roleName => $permissionNames) {
            $role = Role::updateOrCreate(
                ['name' => $roleName],
                ['description' => $roleName . ' role']
            );

            $role->permissions()->sync(
                collect($permissionNames)
                    ->map(fn($permissionName) => $permissionModels[$permissionName]->id)
                    ->all()
            );
        }
    }
}
