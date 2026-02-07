<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use App\Models\Permission;
use App\Models\Role;
use App\Models\MenuItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CaptainPinAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup permissions and roles
        $permission = Permission::create(['name' => 'create_order', 'guard_name' => 'web']);
        $role = Role::create(['name' => 'Captain', 'guard_name' => 'web']);
        $role->permissions()->attach($permission);

        // Clear cache to ensure permissions are reloaded
        \Illuminate\Support\Facades\Cache::forget('system_permissions');
    }

    public function test_captain_can_verify_pin_and_confirm_draft()
    {
        // 1. Setup Captain
        $captain = User::factory()->create([
            'pin' => '1234',
            'is_active' => true,
        ]);
        $captain->roles()->attach(Role::where('name', 'Captain')->first());

        // 2. Setup Draft Order
        $menuItem = MenuItem::factory()->create();
        $order = Order::factory()->create([
            'status' => OrderStatus::Draft,
            'session_token' => 'test-token-123',
        ]);

        $order->items()->create([
            'menu_item_id' => $menuItem->id,
            'prep_section_id' => $menuItem->prep_section_id,
            'quantity' => 2,
            'price' => 10.00,
            'status' => \App\Enums\OrderItemStatus::Draft,
        ]);

        // 3. Verify PIN
        $response = $this->postJson('/api/public/orders/verify-captain', [
            'pin' => '1234',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('captain.id', $captain->id);

        // 4. Submit Draft
        $this->postJson("/api/public/orders/{$order->session_token}/submit")->assertStatus(200);

        $order->refresh();
        $this->assertEquals(OrderStatus::AwaitingConfirmation, $order->status);

        // 5. Confirm Order
        $this->actingAs($captain)->postJson("/api/orders/{$order->id}/confirm", [
            'captain_id' => $captain->id,
        ])->assertStatus(200);

        // 6. Verify database
        $order->refresh();
        $this->assertEquals(OrderStatus::Open, $order->status);
        $this->assertEquals($captain->id, $order->captain_id);
    }

    public function test_invalid_pin_is_rejected()
    {
        User::factory()->create([
            'pin' => '1234',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/public/orders/verify-captain', [
            'pin' => '5678',
        ]);

        $response->assertStatus(401);
    }
}
