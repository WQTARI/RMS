<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultPassword = 'Password123!';

        $users = [
            [
                'name' => 'Admin User',
                'email' => 'admin@rms.test',
                'role' => 'Admin',
            ],
            [
                'name' => 'Cashier User',
                'email' => 'cashier@rms.test',
                'role' => 'Cashier',
            ],
            [
                'name' => 'Reception User',
                'email' => 'reception@rms.test',
                'role' => 'Reception',
            ],
            [
                'name' => 'Kitchen User',
                'email' => 'kitchen@rms.test',
                'role' => 'Kitchen',
                'prep_section' => 'Kitchen',
            ],
            [
                'name' => 'Desserts User',
                'email' => 'desserts@rms.test',
                'role' => 'Desserts',
                'prep_section' => 'Desserts',
            ],
            [
                'name' => 'Drinks User',
                'email' => 'drinks@rms.test',
                'role' => 'Drinks',
                'prep_section' => 'Drinks',
            ],
            [
                'name' => 'Waiter User',
                'email' => 'waiter@rms.test',
                'role' => 'Waiters',
            ],
        ];

        foreach ($users as $userData) {
            $role = Role::where('name', $userData['role'])->first();
            if (!$role) {
                continue;
            }

            $prepSectionId = null;
            if (isset($userData['prep_section'])) {
                $prepSectionId = \App\Models\PrepSection::where('name', $userData['prep_section'])->value('id');
            }

            $user = User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => Hash::make($defaultPassword),
                    'is_active' => true,
                    'prep_section_id' => $prepSectionId,
                ]
            );

            $user->roles()->sync([$role->id]);
        }
    }
}
