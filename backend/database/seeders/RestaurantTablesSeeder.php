<?php

namespace Database\Seeders;

use App\Models\RestaurantTable;
use App\Models\TableSection;
use Illuminate\Database\Seeder;

class RestaurantTablesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sections = TableSection::all()->keyBy('name');

        $tables = [
            'Food' => [
                ['name' => 'F-01', 'capacity' => 2],
                ['name' => 'F-02', 'capacity' => 2],
                ['name' => 'F-03', 'capacity' => 4],
                ['name' => 'F-04', 'capacity' => 4],
                ['name' => 'F-05', 'capacity' => 6],
                ['name' => 'F-06', 'capacity' => 8],
            ],
            'Desserts' => [
                ['name' => 'D-01', 'capacity' => 2],
                ['name' => 'D-02', 'capacity' => 2],
                ['name' => 'D-03', 'capacity' => 4],
                ['name' => 'D-04', 'capacity' => 4],
            ],
            'Families' => [
                ['name' => 'FA-01', 'capacity' => 6],
                ['name' => 'FA-02', 'capacity' => 6],
                ['name' => 'FA-03', 'capacity' => 8],
                ['name' => 'FA-04', 'capacity' => 10],
            ],
            'Youth' => [
                ['name' => 'Y-01', 'capacity' => 4],
                ['name' => 'Y-02', 'capacity' => 4],
                ['name' => 'Y-03', 'capacity' => 6],
                ['name' => 'Y-04', 'capacity' => 6],
            ],
        ];

        foreach ($tables as $sectionName => $sectionTables) {
            $section = $sections->get($sectionName);
            if (!$section) {
                continue;
            }

            foreach ($sectionTables as $tableData) {
                RestaurantTable::updateOrCreate(
                    ['name' => $tableData['name']],
                    [
                        'capacity' => $tableData['capacity'],
                        'section_id' => $section->id,
                    ]
                );
            }
        }
    }
}
