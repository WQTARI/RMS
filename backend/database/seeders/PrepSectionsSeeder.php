<?php

namespace Database\Seeders;

use App\Models\PrepSection;
use Illuminate\Database\Seeder;

class PrepSectionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sections = [
            'Kitchen',
            'Desserts',
            'Drinks',
        ];

        foreach ($sections as $name) {
            PrepSection::updateOrCreate(
                ['name' => $name],
                ['is_active' => true]
            );
        }
    }
}
