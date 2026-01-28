<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class TableSectionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => $this->faker->city,
            'is_active' => true,
        ];
    }
}
