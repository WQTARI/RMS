<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DraftOrderItem;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DraftOrderController extends Controller
{
    /**
     * Get draft order items for a table.
     */
    public function index(string $tableId)
    {
        $items = DraftOrderItem::with('menuItem.prepSection')
            ->where('table_id', $tableId)
            ->get();

        return response()->json($items);
    }

    /**
     * Store draft order items from customer.
     */
    public function store(Request $request, string $tableId)
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.menu_item_id' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        // Clear existing draft items for this table
        DraftOrderItem::where('table_id', $tableId)->delete();

        // Create new draft items
        $draftItems = [];
        foreach ($data['items'] as $item) {
            $draftItems[] = DraftOrderItem::create([
                'table_id' => $tableId,
                'menu_item_id' => $item['menu_item_id'],
                'quantity' => $item['quantity'],
                'notes' => $item['notes'] ?? null,
            ]);
        }

        // Update table status to BROWSING
        $table = RestaurantTable::findOrFail($tableId);
        $table->update(['status' => 'BROWSING']);

        return response()->json([
            'draft_items' => $draftItems,
            'table_status' => $table->status,
        ]);
    }

    public function destroy(string $tableId)
    {
        DraftOrderItem::where('table_id', $tableId)->delete();

        // Update table status back to AVAILABLE
        $table = RestaurantTable::findOrFail($tableId);
        $table->update(['status' => 'AVAILABLE']);

        return response()->json(['message' => 'Draft order cleared']);
    }

    /**
     * Update table status (e.g. to BROWSING).
     */
    public function setStatus(Request $request, string $tableId)
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:BROWSING,AVAILABLE'],
        ]);

        $table = RestaurantTable::findOrFail($tableId);

        // Only update if not already occupied or reserved to prevent overriding active sessions
        if (!in_array($table->status, ['OCCUPIED', 'RESERVED'])) {
            $table->update(['status' => $data['status']]);
        }

        return response()->json(['status' => $table->status]);
    }
}
