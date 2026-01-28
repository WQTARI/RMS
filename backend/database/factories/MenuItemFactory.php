<?php

namespace Database\Factories;

use App\Enums\MenuCategory;
use App\Models\PrepSection;
use Illuminate\Database\Eloquent\Factories\Factory;

class MenuItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->sentence,
            'price' => $this->faker->randomFloat(2, 5, 50),
            'category' => MenuCategory::Food->value, // Assuming basic case, random would be enum value
            'prep_section_id' => PrepSection::factory(),
            'prep_time_minutes' => $this->faker->numberBetween(5, 30),
            'is_active' => true,
        ];
    }
}
