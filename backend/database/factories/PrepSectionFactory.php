<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class PrepSectionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => $this->faker->word,
            'is_active' => true,
        ];
    }
}
