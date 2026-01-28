<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Models\Invoice;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'table_id' => RestaurantTable::factory(),
            'invoice_id' => null, // Simplified for testing, often nullable or factory
            'created_by' => User::factory(),
            'status' => OrderStatus::Open,
            'started_at' => now(),
        ];
    }
}
