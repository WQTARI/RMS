<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\MenuCategory;
use App\Enums\OrderStatus;
use App\Models\Invoice;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PrepSection;
use App\Models\RestaurantTable;
use App\Models\TableSection;
use App\Services\InvoiceService;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceMultiOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_closes_multiple_orders_for_table(): void
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
            'prep_time_minutes' => 10,
            'is_active' => true,
        ]);

        $orderA = app(OrderService::class)->createOrder([
            'table_id' => $table->id,
            'items' => [
                ['menu_item_id' => $menuItem->id, 'quantity' => 1],
            ],
        ]);
        $orderB = app(OrderService::class)->createOrder([
            'table_id' => $table->id,
            'items' => [
                ['menu_item_id' => $menuItem->id, 'quantity' => 2],
            ],
        ]);

        $invoice = Invoice::create([
            'table_id' => $table->id,
            'status' => InvoiceStatus::Open,
            'subtotal' => 0,
            'tax' => 0,
            'discount' => 0,
            'total' => 0,
        ]);

        app(InvoiceService::class)->closeInvoice($invoice, [
            ['method' => 'CASH', 'amount' => 30],
        ], 0, 0, null);

        $this->assertEquals(OrderStatus::Closed, $orderA->fresh()->status);
        $this->assertEquals(OrderStatus::Closed, $orderB->fresh()->status);
        $this->assertEquals(InvoiceStatus::Paid, $invoice->fresh()->status);
    }
}
