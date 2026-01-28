<?php

namespace Database\Factories;

use App\Models\TableSection;
use Illuminate\Database\Eloquent\Factories\Factory;

class RestaurantTableFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'T-' . $this->faker->numberBetween(1, 100),
            'capacity' => $this->faker->numberBetween(2, 8),
            'section_id' => TableSection::factory(),
            'status' => 'AVAILABLE',
        ];
    }
}
