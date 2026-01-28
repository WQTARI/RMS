<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\MenuCategory;
use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Enums\ReservationStatus;
use App\Enums\TableStatus;
use App\Models\Invoice;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PrepSection;
use App\Models\Reservation;
use App\Models\RestaurantTable;
use App\Models\TableSection;
use App\Services\InvoiceService;
use App\Services\OrderService;
use App\Services\TableStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TableStatusFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_table_status_tracks_reservation_order_and_invoice(): void
    {
        $section = TableSection::create(['name' => 'Main', 'is_active' => true]);
        $table = RestaurantTable::create([
            'name' => 'T-01',
            'capacity' => 4,
            'section_id' => $section->id,
            'status' => TableStatus::Available,
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

        $reservation = Reservation::create([
            'customer_name' => 'Test',
            'phone' => '123',
            'date_time' => now()->addMinutes(10),
            'duration_minutes' => 60,
            'number_of_guests' => 2,
            'table_id' => $table->id,
            'status' => ReservationStatus::Created,
        ]);
        app(TableStatusService::class)->updateStatus($table);
        $this->assertEquals(TableStatus::Reserved, $table->fresh()->status);

        $order = app(OrderService::class)->createOrder([
            'table_id' => $table->id,
            'reservation_id' => $reservation->id,
            'items' => [
                ['menu_item_id' => $menuItem->id, 'quantity' => 1],
            ],
        ]);
        app(TableStatusService::class)->updateStatus($table);
        $this->assertEquals(TableStatus::Occupied, $table->fresh()->status);

        $invoice = Invoice::where('table_id', $table->id)
            ->where('status', InvoiceStatus::Open)
            ->firstOrFail();

        app(InvoiceService::class)->closeInvoice($invoice, [
            ['method' => 'CASH', 'amount' => 10],
        ], 0, 0, null);

        $reservation->update(['status' => ReservationStatus::Completed]);
        app(TableStatusService::class)->updateStatus($table);
        $this->assertEquals(TableStatus::Available, $table->fresh()->status);
    }
}
