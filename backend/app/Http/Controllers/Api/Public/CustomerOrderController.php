<?php

namespace App\Http\Controllers\Api\Public;

use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomerOrderController extends Controller
{
    protected OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Create or update a draft order for a customer session.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'table_id' => 'required|exists:restaurant_tables,id',
            'session_token' => 'required|string',
            'items' => 'required|array',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        // Find existing draft for this session and table
        $order = Order::where('table_id', $validated['table_id'])
            ->where('session_token', $validated['session_token'])
            ->where('status', OrderStatus::Draft)
            ->first();

        if ($order) {
            // Update items
            // For customer flow, we might want to replace the whole cart or merge.
            // Let's implement a simple "sync" logic: replace draft items.
            $order->items()->delete();

            $itemsWithStatus = array_map(function ($item) {
                $item['status'] = OrderItemStatus::Draft;
                return $item;
            }, $validated['items']);

            $this->orderService->updateOrderItems($order, $itemsWithStatus);
            return response()->json($order->load('items'));
        }

        // Create new draft
        $orderPayload = [
            'table_id' => $validated['table_id'],
            'session_token' => $validated['session_token'],
            'status' => OrderStatus::Draft,
            'items' => array_map(function ($item) {
                $item['status'] = OrderItemStatus::Draft;
                return $item;
            }, $validated['items']),
            'notes' => $validated['notes'] ?? null,
        ];

        $order = $this->orderService->createOrder($orderPayload);

        return response()->json($order->load('items'), 201);
    }

    /**
     * Submit the draft to the captain.
     */
    public function submit(Request $request, string $token)
    {
        $order = Order::where('session_token', $token)
            ->where('status', OrderStatus::Draft)
            ->firstOrFail();

        Order::allowStatusWrite(fn() => $order->update([
            'status' => OrderStatus::AwaitingConfirmation
        ]));

        return response()->json(['message' => 'Order submitted for confirmation.', 'order' => $order]);
    }

    /**
     * Verify captain PIN for taking over a draft.
     */
    public function verifyCaptain(Request $request)
    {
        $validated = $request->validate([
            'pin' => 'required|string|size:4',
        ]);

        $captain = \App\Models\User::whereNotNull('pin')
            ->get()
            ->filter(fn($user) => $user->verifyPin($validated['pin']))
            ->first();

        if (!$captain || !$captain->hasPermission('create_orders')) {
            return response()->json(['message' => 'Invalid PIN or unauthorized.'], 401);
        }

        return response()->json([
            'message' => 'Captain verified.',
            'captain' => [
                'id' => $captain->id,
                'name' => $captain->name,
            ]
        ]);
    }
}
