<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DraftOrderItem;
use App\Models\RestaurantTable;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Enums\OrderItemStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use App\Enums\OrderStatus;
use App\Enums\TableStatus;
use App\Services\OrderService;

class CaptainOrderController extends Controller
{
    protected $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Captain confirms order from draft items.
     * This endpoint is called after captain scans QR and enters PIN.
     */
    public function confirmOrder(Request $request, string $tableId)
    {
        $data = $request->validate([
            'captain_id' => ['required', 'exists:users,id'],
            'pin' => ['required', 'string', 'size:4'],
            'items' => ['required', 'array'],
            'items.*.menu_item_id' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        // Verify captain PIN
        $captain = User::findOrFail($data['captain_id']);
        if (!\Illuminate\Support\Facades\Hash::check($data['pin'], $captain->pin)) {
            return response()->json([
                'message' => 'Invalid PIN',
            ], 401);
        }

        $table = RestaurantTable::findOrFail($tableId);

        return DB::transaction(function () use ($tableId, $table, $captain, $data) {
            // Use OrderService to handle invoice linkage and printing
            $order = $this->orderService->createOrder([
                'table_id' => $tableId,
                'customer_name' => $table->name,
                'created_by' => $captain->id,
                'captain_id' => $captain->id,
                'status' => OrderStatus::Open,
                'items' => $data['items']
            ]);

            // Clear draft items
            DraftOrderItem::where('table_id', $tableId)->delete();

            // Update table status to OCCUPIED
            $table->update(['status' => TableStatus::Occupied->value]);

            return response()->json([
                'order' => $order->load(['items.menuItem', 'table']),
                'message' => 'Order confirmed successfully',
            ], 201);
        });
    }
}
