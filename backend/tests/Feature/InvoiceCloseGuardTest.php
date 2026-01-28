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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class InvoiceCloseGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_cannot_close_without_paid_invoice(): void
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

        $order = Order::create([
            'table_id' => $table->id,
            'status' => OrderStatus::Open,
            'started_at' => now(),
        ]);
        $order->items()->create([
            'menu_item_id' => $menuItem->id,
            'prep_section_id' => $prepSection->id,
            'quantity' => 1,
            'price' => 10,
            'status' => 'PENDING',
        ]);

        $invoice = Invoice::create([
            'table_id' => $table->id,
            'status' => InvoiceStatus::Open,
            'subtotal' => 0,
            'tax' => 0,
            'discount' => 0,
            'total' => 0,
        ]);

        $order->update(['invoice_id' => $invoice->id]);

        $this->expectException(ValidationException::class);
        Order::allowStatusWrite(fn () => $order->update(['status' => OrderStatus::Closed]));
    }
}
