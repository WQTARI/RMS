<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\OrderItemStatus;
use App\Enums\RoleName;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\OrderService;
use App\Services\TableStatusService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Order::class);

        $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'table_id' => ['nullable', 'exists:restaurant_tables,id'],
            'invoice_id' => ['nullable', 'exists:invoices,id'],
            'status' => ['nullable', 'string'],
            'search' => ['nullable', 'string', 'max:100'],
            'paginate' => ['nullable'],
            'kitchen_visible' => ['nullable'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Order::with(['items.menuItem', 'table.section', 'reservation', 'invoice'])
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%$search%")
                    ->orWhere('customer_name', 'like', "%$search%");
            });
        }

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->input('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->input('end_date'));
        }

        if ($request->filled('table_id')) {
            $query->where('table_id', $request->input('table_id'));
        }

        if ($request->filled('invoice_id')) {
            $query->where('invoice_id', $request->input('invoice_id'));
        }

        if ($request->filled('status')) {
            $status = strtoupper((string) $request->input('status'));
            if ($status === 'ACTIVE') {
                $query->whereIn('status', [\App\Enums\OrderStatus::Open, \App\Enums\OrderStatus::InProgress, \App\Enums\OrderStatus::Ready]);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->boolean('ready_only')) {
            $query->whereHas('items', function ($q) {
                $q->where('status', OrderItemStatus::Ready);
            });
        }

        $perPage = request('per_page', 20);
        $user = auth()->user();

        // If production staff, only show orders with items for their section
        if ($user && $user->prep_section_id) {
            $query->whereHas('items', function ($q) use ($user) {
                $q->where('prep_section_id', $user->prep_section_id);
            });
        }

        // Apply 5-record limit for Analysis role early
        if ($user && ($user->hasPermission('view_limited_archive') || $user->email === 'stat@rms.com')) {
            $results = $query->limit(5)->get();
            return response()->json([
                'data' => $results,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => 5,
                'total' => $results->count(),
                'from' => 1,
                'to' => $results->count()
            ]);
        }

        if (request()->boolean('paginate', true)) {
            $orders = $query->paginate($perPage);
        } else {
            $orders = $query->get();
        }

        if (request()->boolean('kitchen_visible') && !request()->boolean('paginate')) {
            $orders = $orders->filter(fn(Order $order) => $order->isKitchenVisible())->values();

            // Further filter items within orders to only show those belonging to the user's section
            if ($user && $user->prep_section_id) {
                foreach ($orders as $order) {
                    /** @var \App\Models\Order $order */
                    $order->setRelation('items', $order->items->filter(fn($item) => $item->prep_section_id === $user->prep_section_id)->values());
                }
            }
        }

        if (request()->boolean('ready_only')) {
            foreach ($orders as $order) {
                /** @var \App\Models\Order $order */
                $order->setRelation('items', $order->items->filter(fn($item) => $item->status === OrderItemStatus::Ready)->values());
            }
        }

        return response()->json($orders);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Order::class);

        $data = $request->validate([
            'table_id' => ['nullable', 'exists:restaurant_tables,id'],
            'reservation_id' => ['nullable', 'exists:reservations,id'],
            'invoice_id' => ['nullable', 'exists:invoices,id'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.menu_item_id' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        $order = app(OrderService::class)->createOrder([
            'table_id' => $data['table_id'] ?? null,
            'reservation_id' => $data['reservation_id'] ?? null,
            'invoice_id' => $data['invoice_id'] ?? null,
            'customer_name' => $data['customer_name'] ?? null,
            'items' => $data['items'],
            'created_by' => $request->user()?->id,
        ]);

        return response()->json($order->load(['items.menuItem', 'table.section']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $order = Order::with(['items.menuItem', 'table.section'])->findOrFail($id);
        $this->authorize('view', $order);

        return response()->json($order);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $order = Order::findOrFail($id);
        $this->authorize('update', $order);

        $data = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['nullable', 'exists:order_items,id'],
            'items.*.menu_item_id' => ['required_without:items.*.id', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:0'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        app(OrderService::class)->updateOrderItems($order, $data['items'], $request->user()?->id);

        return response()->json($order->load(['items.menuItem', 'table.section']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $order = Order::findOrFail($id);
        $this->authorize('delete', $order);

        // Log deletion
        \App\Models\OrderAudit::create([
            'order_id' => $order->id,
            'user_id' => auth()->id(),
            'action' => 'order_deleted',
            'previous_status' => $order->status->value,
            'reason' => 'Order manually removed by user.',
            'occurred_at' => now(),
        ]);

        $order->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function updateItemStatus(Request $request, string $id)
    {
        $orderItem = OrderItem::with('order.table')->findOrFail($id);
        $this->authorize('updateItemStatus', $orderItem);

        $data = $request->validate([
            'status' => ['required', Rule::enum(OrderItemStatus::class)],
        ]);

        $orderItem = app(OrderService::class)->updateItemStatus($orderItem, OrderItemStatus::from($data['status']));

        return response()->json($orderItem->load('menuItem', 'order.table'));
    }

    public function confirm(string $id)
    {
        $order = Order::with(['items.menuItem', 'table.section', 'reservation'])->findOrFail($id);

        if (request()->user()->cannot('confirm', $order)) {
            abort(403, 'Not authorized to confirm orders.');
        }
        if (!$order->confirmed_at) {
            $order->update(['confirmed_at' => now()]);
            app(OrderService::class)->dispatchProductionTickets($order);
        }

        return response()->json($order);
    }

    public function cancel(string $id)
    {
        $order = Order::findOrFail($id);
        $this->authorize('delete', $order); // Reuse delete permission for cancellation

        $order = app(OrderService::class)->cancelOrder($order, auth()->id());

        return response()->json($order->load(['items.menuItem', 'table.section']));
    }

    public function serveItem(string $id)
    {
        $orderItem = OrderItem::with('order.table')->findOrFail($id);

        $this->authorize('serve', $orderItem);

        $orderItem = app(OrderService::class)->updateItemStatus($orderItem, OrderItemStatus::Served);

        return response()->json($orderItem->load('menuItem', 'order.table'));
    }
}
