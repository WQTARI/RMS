<?php

namespace Tests\Feature;

use App\Enums\OrderItemStatus;
use App\Enums\RoleName;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PrepSection;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed permissions if needed, usually managed by Seeders in real app.
        // For isolation, we assume User model hasPermission works via Roles.
    }

    public function test_waiter_cannot_confirm_order(): void
    {
        // 1. Create a User with 'Waiter' role
        $waiterRole = Role::factory()->create(['name' => 'Waiter']);
        // Assign permissions if necessary via factory/seeder
        $user = User::factory()->create();
        $user->roles()->attach($waiterRole);

        // 2. Create an Order
        $order = Order::factory()->create();

        // 3. Act: Attempt to confirm
        $response = $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/confirm");

        // 4. Assert: Forbidden (403)
        $response->assertForbidden();
    }

    public function test_manager_can_confirm_order(): void
    {
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('name', 'Admin')->first());
        $user->refresh();

        $order = Order::factory()->create(['confirmed_at' => null]);

        $response = $this->actingAs($user)
            ->postJson("/api/orders/{$order->id}/confirm");

        $response->assertOk();
        $order->refresh();
        $this->assertNotNull($order->confirmed_at);
    }

    public function test_kitchen_staff_cannot_update_dessert_item(): void
    {
        // 1. Setup Kitchen User
        $kitchenRole = Role::factory()->create(['name' => 'Kitchen']);
        $kitchenUser = User::factory()->create();
        $kitchenUser->roles()->attach($kitchenRole);
        // Assuming they have 'update_item_status' permission
        // $kitchenRole->permissions()->attach(...); 

        // 2. Setup Dessert Item
        $dessertSection = PrepSection::factory()->create(['name' => 'Desserts']);
        $menuItem = MenuItem::factory()->create(['prep_section_id' => $dessertSection->id]);
        $order = Order::factory()->create();
        $item = OrderItem::factory()->create([
            'order_id' => $order->id,
            'menu_item_id' => $menuItem->id,
            'status' => OrderItemStatus::Pending
        ]);

        // 3. Act
        $response = $this->actingAs($kitchenUser)
            ->patchJson("/api/order-items/{$item->id}/status", [
                'status' => OrderItemStatus::Preparing->value
            ]);

        // 4. Assert: Forbidden (Policy should verify section mismatch)
        $response->assertForbidden();
    }
}
