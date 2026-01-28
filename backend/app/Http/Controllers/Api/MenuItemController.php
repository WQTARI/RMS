<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MenuItemController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('view_only');
        $query = MenuItem::with('prepSection')->orderBy('name');

        if (request()->has('active')) {
            $query->where('is_active', filter_var(request('active'), FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('manage_settings');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string'],
            'category' => ['nullable', 'string'], // Will be overwritten
            'prep_section_id' => ['required', 'exists:prep_sections,id'],
            'prep_time_minutes' => ['required', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $prepSection = \App\Models\PrepSection::findOrFail($data['prep_section_id']);
        $data['category'] = strtoupper($prepSection->name);

        $menuItem = MenuItem::create($data);

        return response()->json($menuItem->load('prepSection'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $this->authorize('view_only');
        return response()->json(MenuItem::with('prepSection')->findOrFail($id));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $this->authorize('manage_settings');
        $menuItem = MenuItem::findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'image_url' => ['nullable', 'string'],
            'category' => ['nullable', 'string'],
            'prep_section_id' => ['sometimes', 'exists:prep_sections,id'],
            'prep_time_minutes' => ['sometimes', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (isset($data['prep_section_id'])) {
            $prepSection = \App\Models\PrepSection::findOrFail($data['prep_section_id']);
            $data['category'] = strtoupper($prepSection->name);
        }

        $menuItem->update($data);

        return response()->json($menuItem->load('prepSection'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $this->authorize('manage_settings');
        MenuItem::findOrFail($id)->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
