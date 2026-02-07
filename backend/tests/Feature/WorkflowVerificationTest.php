<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\PrepSection;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkflowVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_workflow_status_and_printing()
    {
        // 1. Setup Data
        $category = MenuCategory::factory()->create(['name' => 'Main Course']);
        $kitchen = PrepSection::factory()->create(['name' => 'Kitchen']);
        $bar = PrepSection::factory()->create(['name' => 'Bar']);

        $burger = MenuItem::factory()->create([
            'name' => 'Burger',
            'category' => 'Main Course',
            'prep_section_id' => $kitchen->id,
            'price' => 10
        ]);

        $coke = MenuItem::factory()->create([
            'name' => 'Coke',
            'category' => 'Drinks',
            'prep_section_id' => $bar->id,
            'price' => 3
        ]);

        $table = RestaurantTable::factory()->create(['name' => 'T1', 'status' => 'AVAILABLE']);
        $captain = User::factory()->create(['name' => 'Captain Jack', 'pin' => '1234', 'role_id' => 2]); // Assuming 2 is captain role

        // 2. Customer Scans & Creates Draft (Yellow Status)
        $sessionToken = 'session_xyz';
        $response = $this->postJson('/api/public/tables/' . $table->id . '/draft-order', [
            'items' => [
                ['menu_item_id' => $burger->id, 'quantity' => 2],
                ['menu_item_id' => $coke->id, 'quantity' => 1],
            ]
        ]);

        $response->assertStatus(200);
        $this->assertEquals('BROWSING', $table->fresh()->status->value); // Verify YELLOW status

        // 3. Captain Confirms Order (Red Status)
        $response = $this->postJson("/api/public/tables/{$table->id}/confirm-order", [
            'captain_id' => $captain->id,
            'pin' => '1234',
            'items' => [
                ['menu_item_id' => $burger->id, 'quantity' => 2],
                ['menu_item_id' => $coke->id, 'quantity' => 1],
            ]
        ]);

        $response->assertStatus(201);
        $this->assertEquals('OCCUPIED', $table->fresh()->status->value); // Verify RED status
        $orderId = $response->json('order.id');

        // 4. Create Invoice & Close (Simulate Payment)
        // Note: In real app, invoice creation might happen automatically or manually.
        // Let's assume we create an invoice for this order.
        $invoiceResponse = $this->postJson('/api/invoices', ['table_id' => $table->id]);
        $invoiceId = $invoiceResponse->json('id');

        // Link order to invoice
        Order::find($orderId)->update(['invoice_id' => $invoiceId]);

        // 5. Verify Split Printing Logic
        $ticketResponse = $this->getJson("/api/invoices/{$invoiceId}/tickets");
        $ticketResponse->assertStatus(200);

        $tickets = $ticketResponse->json();
        $this->assertCount(2, $tickets); // Should have 1 for Kitchen, 1 for Bar

        $kitchenTicket = collect($tickets)->firstWhere('section_name', 'Kitchen');
        $barTicket = collect($tickets)->firstWhere('section_name', 'Bar');

        $this->assertNotNull($kitchenTicket);
        $this->assertNotNull($barTicket);
        $this->assertCount(1, $kitchenTicket['items']); // Burger
        $this->assertCount(1, $barTicket['items']); // Coke
    }
}
