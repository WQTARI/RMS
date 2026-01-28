<?php

namespace Tests\Feature;

use App\Enums\MenuCategory;
use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PrepSection;
use App\Models\RestaurantTable;
use App\Models\TableSection;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_status_derives_from_item_progress(): void
    {
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
            'prep_time_minutes' => 15,
            'is_active' => true,
        ]);

        $order = app(OrderService::class)->createOrder([
            'table_id' => $table->id,
            'items' => [
                ['menu_item_id' => $menuItem->id, 'quantity' => 1],
            ],
        ]);

        $order->refresh();
        $this->assertEquals(OrderStatus::Open, $order->status);

        $item = OrderItem::where('order_id', $order->id)->firstOrFail();
        app(OrderService::class)->updateItemStatus($item, OrderItemStatus::Preparing);
        $this->assertEquals(OrderStatus::InProgress, $order->refresh()->status);

        $item = OrderItem::where('order_id', $order->id)->firstOrFail();
        app(OrderService::class)->updateItemStatus($item, OrderItemStatus::Ready);
        $this->assertEquals(OrderStatus::Ready, $order->refresh()->status);
    }
}
