<?php

namespace Tests\Feature;

use App\Enums\MenuCategory;
use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Events\OrderRegressedToInProgress;
use App\Models\MenuItem;
use App\Models\OrderItem;
use App\Models\PrepSection;
use App\Models\RestaurantTable;
use App\Models\TableSection;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class OrderRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_ready_order_regresses_and_audits_when_item_is_added(): void
    {
        Event::fake([OrderRegressedToInProgress::class]);
        Log::spy();

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
        $secondItem = MenuItem::create([
            'name' => 'Salad',
            'price' => 6,
            'category' => MenuCategory::Food,
            'prep_section_id' => $prepSection->id,
            'prep_time_minutes' => 10,
            'is_active' => true,
        ]);

        $order = app(OrderService::class)->createOrder([
            'table_id' => $table->id,
            'items' => [
                ['menu_item_id' => $menuItem->id, 'quantity' => 1],
            ],
        ]);

        $item = OrderItem::where('order_id', $order->id)->firstOrFail();
        app(OrderService::class)->updateItemStatus($item, OrderItemStatus::InProgress);
        $item = OrderItem::where('order_id', $order->id)->firstOrFail();
        app(OrderService::class)->updateItemStatus($item, OrderItemStatus::Ready);

        $this->assertEquals(OrderStatus::Ready, $order->refresh()->status);

        app(OrderService::class)->updateOrderItems($order, [
            ['menu_item_id' => $secondItem->id, 'quantity' => 1],
        ], 123);

        $this->assertEquals(OrderStatus::InProgress, $order->refresh()->status);

        Event::assertDispatched(OrderRegressedToInProgress::class);

        Log::shouldHaveReceived('info')->withArgs(function (string $message, array $context) use ($order) {
            return $message === 'order.audit'
                && ($context['order_id'] ?? null) === $order->id
                && ($context['previous_status'] ?? null) === OrderStatus::Ready->value
                && ($context['new_status'] ?? null) === OrderStatus::InProgress->value
                && ($context['reason'] ?? null) === 'Order modified after it was READY';
        })->once();
    }
}
