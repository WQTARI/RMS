<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrepSection;
use Illuminate\Http\Request;

class PrepSectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('viewAny', PrepSection::class);
        return response()->json(PrepSection::query()->orderBy('name')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', PrepSection::class);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        return response()->json(PrepSection::create($data), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $section = PrepSection::findOrFail($id);
        $this->authorize('view', $section);
        return response()->json($section);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $section = PrepSection::findOrFail($id);
        $this->authorize('update', $section);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
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
        $section = PrepSection::findOrFail($id);
        $this->authorize('delete', $section);
        $section->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
