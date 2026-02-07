<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\MenuCategory;
use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Enums\TableStatus;
use App\Models\Invoice;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PrepSection;
use App\Models\RestaurantTable;
use App\Models\TableSection;
use App\Models\User;
use App\Services\OrderService;
use App\Services\InvoiceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComprehensiveWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected $section;
    protected $table;
    protected $kitchen;
    protected $bar;
    protected $burger;
    protected $coke;
    protected $captain;
    protected $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup base data
        $this->section = TableSection::create(['name' => 'Main', 'is_active' => true]);
        $this->table = RestaurantTable::create([
            'name' => 'T-01',
            'capacity' => 4,
            'section_id' => $this->section->id,
        ]);

        $this->kitchen = PrepSection::create([
            'name' => 'Kitchen',
            'printer_ip' => '192.168.1.100',
            'is_active' => true
        ]);
        $this->bar = PrepSection::create([
            'name' => 'Bar',
            'printer_ip' => '192.168.1.101',
            'is_active' => true
        ]);

        \Illuminate\Support\Facades\Cache::forget('system_permissions');
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);

        $this->burger = MenuItem::create([
            'name' => 'Burger',
            'price' => 10,
            'category' => MenuCategory::Food->value,
            'prep_section_id' => $this->kitchen->id,
            'is_active' => true,
        ]);

        $this->coke = MenuItem::create([
            'name' => 'Coke',
            'price' => 2,
            'category' => MenuCategory::Drinks->value,
            'prep_section_id' => $this->bar->id,
            'is_active' => true,
        ]);

        $this->captain = User::factory()->create(['email' => 'captain@rms.com', 'is_active' => true]);
        $this->captain->roles()->attach(\App\Models\Role::where('name', 'Admin')->first());

        $this->cashier = User::factory()->create(['email' => 'cashier@rms.com', 'is_active' => true]);
        $this->cashier->roles()->attach(\App\Models\Role::where('name', 'Admin')->first());

        // Refresh to ensure roles are loaded
        $this->captain = $this->captain->fresh();
        \Illuminate\Support\Facades\Log::info("Debug: Captain role check", [
            'has_admin_role' => $this->captain->roles()->where('name', 'Admin')->exists(),
            'has_create_order' => $this->captain->hasPermission('create_order')
        ]);
    }

    public function test_full_ordering_to_payment_lifecycle(): void
    {
        // 1. Initial State
        $this->assertEquals(TableStatus::Available->value, $this->table->fresh()->status->value);

        // 2. Customer QR Order (Draft)
        $sessionToken = 'test-session-123';
        $response = $this->postJson('/api/public/orders', [
            'table_id' => $this->table->id,
            'session_token' => $sessionToken,
            'items' => [
                ['menu_item_id' => $this->burger->id, 'quantity' => 1, 'notes' => 'No onions'],
            ]
        ]);

        $response->assertStatus(201);
        $this->assertEquals(TableStatus::Browsing->value, $this->table->fresh()->status->value);

        // 3. Customer Submit Order (Awaiting Confirmation)
        $this->postJson("/api/public/orders/{$sessionToken}/submit")
            ->assertSuccessful();
        $this->assertEquals(TableStatus::Browsing->value, $this->table->fresh()->status->value);

        // 4. Captain Confirms Order
        $order = Order::where('session_token', $sessionToken)->firstOrFail();

        $this->actingAs($this->captain)
            ->postJson("/api/orders/{$order->id}/confirm")
            ->assertSuccessful();

        $this->assertEquals(TableStatus::Occupied->value, $this->table->fresh()->status->value);
        $this->assertEquals(OrderStatus::Open, $order->fresh()->status);

        // 5. Verify Printer Routing (Split Tickets)
        // Add a drink to the same session via captain to test multi-prep splitting
        $this->actingAs($this->captain)
            ->putJson("/api/orders/{$order->id}", [
                'items' => [
                    ['id' => $order->items->first()->id, 'quantity' => 1], // keep burger
                    ['menu_item_id' => $this->coke->id, 'quantity' => 2], // add coke
                ]
            ])->assertSuccessful();

        $invoice = $order->fresh()->invoice;
        $ticketsResponse = $this->actingAs($this->cashier)
            ->getJson("/api/invoices/{$invoice->id}/tickets");

        $ticketsResponse->assertSuccessful();
        $tickets = $ticketsResponse->json();

        $this->assertCount(2, $tickets);
        $this->assertTrue(collect($tickets)->contains('section_name', 'Kitchen'));
        $this->assertTrue(collect($tickets)->contains('section_name', 'Bar'));

        // 6. Cashier Closes Invoice
        $this->actingAs($this->cashier)
            ->putJson("/api/invoices/{$invoice->id}", [
                'tax' => 0,
                'discount' => 0,
                'payments' => [
                    ['method' => 'CASH', 'amount' => 14] // 10 + 2*2
                ]
            ])->assertSuccessful();

        $this->assertEquals(TableStatus::Available->value, $this->table->fresh()->status->value);
    }

    public function test_concurrency_simultaneous_qr_drafts(): void
    {
        // Session A starts a draft
        $tokenA = 'session-a';
        $this->postJson('/api/public/orders', [
            'table_id' => $this->table->id,
            'session_token' => $tokenA,
            'items' => [['menu_item_id' => $this->burger->id, 'quantity' => 1]]
        ])->assertSuccessful();

        // Session B starts a draft for same table
        $tokenB = 'session-b';
        $this->postJson('/api/public/orders', [
            'table_id' => $this->table->id,
            'session_token' => $tokenB,
            'items' => [['menu_item_id' => $this->coke->id, 'quantity' => 1]]
        ])->assertSuccessful();

        $this->assertEquals(TableStatus::Browsing->value, $this->table->fresh()->status->value);

        // Captain confirms Order A
        $orderA = Order::where('session_token', $tokenA)->firstOrFail();
        $this->actingAs($this->captain)->postJson("/api/orders/{$orderA->id}/confirm")
            ->assertSuccessful();

        $this->assertEquals(TableStatus::Occupied->value, $this->table->fresh()->status->value);

        // Order B should still be a Draft (browsing state is now merged into occupied conceptually)
        $orderB = Order::where('session_token', $tokenB)->firstOrFail();
        $this->assertEquals(OrderStatus::Draft, $orderB->status);
    }

    public function test_failure_recovery_incomplete_payment(): void
    {
        // Setup occupied table
        $token = 'session-recovery';
        $this->postJson('/api/public/orders', [
            'table_id' => $this->table->id,
            'session_token' => $token,
            'items' => [['menu_item_id' => $this->burger->id, 'quantity' => 1]]
        ])->assertSuccessful();
        $order = Order::where('session_token', $token)->firstOrFail();
        $this->actingAs($this->captain)->postJson("/api/orders/{$order->id}/confirm")
            ->assertSuccessful();

        $invoice = $order->fresh()->invoice;

        // Attempt partial payment (if system allows, but here we test if it STAYS occupied)
        $this->actingAs($this->cashier)
            ->putJson("/api/invoices/{$invoice->id}", [
                'tax' => 0,
                'discount' => 0,
                'payments' => [
                    ['method' => 'CASH', 'amount' => 5] // Only partial (burger is 10)
                ]
            ])->assertStatus(422); // Assuming validator requires full payment or explicit check

        $this->assertEquals(TableStatus::Occupied->value, $this->table->fresh()->status->value);
        $this->assertEquals(InvoiceStatus::Open, $invoice->fresh()->status);
    }

    public function test_edge_case_ordering_from_occupied_table(): void
    {
        // Table is occupied by Session A
        $tokenA = 'session-a';
        $this->postJson('/api/public/orders', [
            'table_id' => $this->table->id,
            'session_token' => $tokenA,
            'items' => [['menu_item_id' => $this->burger->id, 'quantity' => 1]]
        ])->assertSuccessful();
        $orderA = Order::where('session_token', $tokenA)->firstOrFail();
        $this->actingAs($this->captain)->postJson("/api/orders/{$orderA->id}/confirm")
            ->assertSuccessful();

        // New Customer (Session B) tries to order from same table
        $tokenB = 'session-b';
        $response = $this->postJson('/api/public/orders', [
            'table_id' => $this->table->id,
            'session_token' => $tokenB,
            'items' => [['menu_item_id' => $this->coke->id, 'quantity' => 1]]
        ])->assertSuccessful();

        $this->assertEquals(TableStatus::Occupied->value, $this->table->fresh()->status->value);
    }
}
