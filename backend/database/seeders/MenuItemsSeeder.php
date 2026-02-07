<?php

namespace Database\Seeders;

use App\Enums\MenuCategory;
use App\Models\MenuItem;
use App\Models\PrepSection;
use Illuminate\Database\Seeder;

class MenuItemsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $prepSections = PrepSection::all()->keyBy('name');

        $items = [
            [
                'name' => 'Classic Cheeseburger',
                'price' => 12.50,
                'description' => 'Beef patty, cheddar, house sauce, brioche bun.',
                'category' => MenuCategory::Food,
                'prep_section' => 'Kitchen',
            ],
            [
                'name' => 'Grilled Chicken Bowl',
                'price' => 11.75,
                'description' => 'Herb chicken, rice, seasonal vegetables.',
                'category' => MenuCategory::Food,
                'prep_section' => 'Kitchen',
            ],
            [
                'name' => 'Spaghetti Bolognese',
                'price' => 13.25,
                'description' => 'Slow-cooked beef ragu, parmesan, basil.',
                'category' => MenuCategory::Food,
                'prep_section' => 'Kitchen',
            ],
            [
                'name' => 'Margherita Flatbread',
                'price' => 9.95,
                'description' => 'Tomato, mozzarella, basil, olive oil.',
                'category' => MenuCategory::Food,
                'prep_section' => 'Kitchen',
            ],
            [
                'name' => 'Chocolate Lava Cake',
                'price' => 7.50,
                'description' => 'Warm chocolate cake with molten center.',
                'category' => MenuCategory::Dessert,
                'prep_section' => 'Desserts',
            ],
            [
                'name' => 'Strawberry Cheesecake',
                'price' => 6.95,
                'description' => 'Creamy cheesecake, strawberry glaze.',
                'category' => MenuCategory::Dessert,
                'prep_section' => 'Desserts',
            ],
            [
                'name' => 'Seasonal Fruit Tart',
                'price' => 6.25,
                'description' => 'Vanilla custard, fresh fruit, crisp crust.',
                'category' => MenuCategory::Dessert,
                'prep_section' => 'Desserts',
            ],
            [
                'name' => 'Vanilla Bean Ice Cream',
                'price' => 4.50,
                'description' => 'Two scoops with house-made caramel.',
                'category' => MenuCategory::Dessert,
                'prep_section' => 'Desserts',
            ],
        ];

        // Add Drinks
        $items[] = [
            'name' => 'Mojito',
            'price' => 8.00,
            'description' => 'Fresh mint, lime, soda.',
            'category' => MenuCategory::Drinks,
            'prep_section' => 'Drinks',
        ];
        $items[] = [
            'name' => 'Espresso',
            'price' => 3.50,
            'description' => 'Single shot premium coffee.',
            'category' => MenuCategory::Drinks,
            'prep_section' => 'Drinks',
        ];

        // Add more Kitchen items
        $items[] = [
            'name' => 'T-Bone Steak',
            'price' => 35.00,
            'description' => '500g grilled steak with herbs.',
            'category' => MenuCategory::Food,
            'prep_section' => 'Kitchen',
        ];

        foreach ($items as $item) {
            $prepSection = $prepSections->get($item['prep_section']);
            if (!$prepSection) {
                continue;
            }

            MenuItem::updateOrCreate(
                ['name' => $item['name']],
                [
                    'price' => $item['price'],
                    'description' => $item['description'],
                    'category' => $item['category']->value,
                    'prep_section_id' => $prepSection->id,
                    'is_active' => true,
                ]
            );
        }
    }
}
