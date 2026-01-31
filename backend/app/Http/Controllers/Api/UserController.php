<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $this->authorize('viewAny', User::class);
        return response()->json(User::with('roles.permissions')->orderBy('name')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', User::class);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['nullable', 'string'],
            'password' => ['required', 'string', 'min:6'],
            'is_active' => ['nullable', 'boolean'],
            'prep_section_id' => ['nullable', 'exists:prep_sections,id'],
            'role_ids' => ['nullable', 'array'],
            'role_ids.*' => ['exists:roles,id'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'is_active' => $data['is_active'] ?? true,
            'prep_section_id' => $data['prep_section_id'] ?? null,
        ]);

        if (!empty($data['role_ids'])) {
            $user->roles()->sync($data['role_ids']);
            $user->load('roles'); // Ensure roles are loaded for the sync logic
            $user->syncPrepSectionFromRoles();
        }

        return response()->json($user->load('roles.permissions'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $user = User::with('roles.permissions')->findOrFail($id);
        $this->authorize('view', $user);

        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('update', $user);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,' . $user->id],
            'phone' => ['nullable', 'string'],
            'password' => ['nullable', 'string', 'min:6'],
            'is_active' => ['nullable', 'boolean'],
            'prep_section_id' => ['nullable', 'exists:prep_sections,id'],
            'role_ids' => ['nullable', 'array'],
            'role_ids.*' => ['exists:roles,id'],
        ]);

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        if (array_key_exists('role_ids', $data)) {
            $user->roles()->sync($data['role_ids'] ?? []);
            $user->load('roles');
            $user->syncPrepSectionFromRoles();
        }

        return response()->json($user->load('roles.permissions'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $user = User::findOrFail($id);
        $this->authorize('delete', $user);

        $user->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
