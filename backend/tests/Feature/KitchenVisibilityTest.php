<?php

namespace Tests\Feature;

use App\Enums\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PrepSection;
use App\Models\Reservation;
use App\Models\RestaurantTable;
use App\Models\TableSection;
use App\Services\OrderService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KitchenVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_kitchen_visibility_for_preorders_uses_prep_time(): void
    {
        Carbon::setTestNow('2026-01-23 10:00:00');

        $section = TableSection::create(['name' => 'Main', 'is_active' => true]);
        $table = RestaurantTable::create([
            'name' => 'T-01',
            'capacity' => 4,
            'section_id' => $section->id,
            'status' => 'AVAILABLE',
        ]);
        $prepSection = PrepSection::create(['name' => 'Kitchen', 'is_active' => true]);
        $menuItem = MenuItem::create([
            'name' => 'Burger',
            'price' => 10,
            'category' => MenuCategory::Food,
            'prep_section_id' => $prepSection->id,
            'prep_time_minutes' => 30,
            'is_active' => true,
        ]);
        $reservation = Reservation::create([
            'customer_name' => 'Test',
            'phone' => '123',
            'date_time' => '2026-01-23 11:00:00',
            'duration_minutes' => 60,
            'number_of_guests' => 2,
            'table_id' => $table->id,
            'status' => 'CREATED',
        ]);

        $order = app(OrderService::class)->createOrder([
            'table_id' => $table->id,
            'reservation_id' => $reservation->id,
            'items' => [
                ['menu_item_id' => $menuItem->id, 'quantity' => 1],
            ],
        ]);

        $this->assertFalse($order->refresh()->isKitchenVisible());

        Carbon::setTestNow('2026-01-23 10:30:00');
        $this->assertTrue($order->refresh()->isKitchenVisible());

        Carbon::setTestNow('2026-01-23 10:05:00');
        $order->update(['confirmed_at' => now()]);
        $this->assertTrue($order->refresh()->isKitchenVisible());
    }
}
