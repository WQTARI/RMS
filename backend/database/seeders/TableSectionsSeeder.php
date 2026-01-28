<?php

namespace Database\Seeders;

use App\Models\TableSection;
use Illuminate\Database\Seeder;

class TableSectionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sections = [
            'Food' => 'Main dining area.',
            'Desserts' => 'Dessert lounge seating.',
            'Families' => 'Family-friendly seating zone.',
            'Youth' => 'Youth group seating.',
        ];

        foreach ($sections as $name => $description) {
            TableSection::updateOrCreate(
                ['name' => $name],
                ['description' => $description, 'is_active' => true]
            );
        }
    }
}
