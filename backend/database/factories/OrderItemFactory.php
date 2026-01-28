<?php

namespace Database\Factories;

use App\Enums\OrderItemStatus;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PrepSection;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderItemFactory extends Factory
{
    public function definition(): array
    {
        $menuItem = MenuItem::factory()->create();

        return [
            'order_id' => Order::factory(),
            'menu_item_id' => $menuItem->id,
            'prep_section_id' => $menuItem->prep_section_id, // Sync with menu item
            'quantity' => $this->faker->numberBetween(1, 3),
            'price' => $menuItem->price,
            'status' => OrderItemStatus::Pending,
        ];
    }
}
