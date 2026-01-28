<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TableSection;
use Illuminate\Http\Request;

class TableSectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('viewAny', TableSection::class);
        return response()->json(TableSection::query()->orderBy('name')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', TableSection::class);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        return response()->json(TableSection::create($data), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $section = TableSection::findOrFail($id);
        $this->authorize('view', $section);
        return response()->json($section);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $section = TableSection::findOrFail($id);
        $this->authorize('update', $section);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $section->update($data);

        return response()->json($section);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $section = TableSection::findOrFail($id);
        $this->authorize('delete', $section);
        $section->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
