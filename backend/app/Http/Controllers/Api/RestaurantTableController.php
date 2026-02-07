<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RestaurantTable;
use App\Services\TableStatusService;
use Illuminate\Http\Request;

class RestaurantTableController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(
            RestaurantTable::with(['section', 'orders.items'])
                ->orderBy('name')
                ->get()
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', RestaurantTable::class);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'capacity' => ['required', 'integer', 'min:1'],
            'section_id' => ['required', 'exists:table_sections,id'],
        ]);

        $table = RestaurantTable::create($data);

        return response()->json($table->load('section'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $table = RestaurantTable::with('section')->findOrFail($id);
        $this->authorize('view', $table);
        return response()->json($table);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $table = RestaurantTable::findOrFail($id);
        $this->authorize('update', $table);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'capacity' => ['sometimes', 'integer', 'min:1'],
            'section_id' => ['sometimes', 'exists:table_sections,id'],
        ]);

        $table->update($data);

        return response()->json($table->load('section'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $table = RestaurantTable::findOrFail($id);
        $this->authorize('delete', $table);
        $table->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
