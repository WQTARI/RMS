<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string'],
        ]);

        $user = \App\Models\User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'User inactive'], 403);
        }

        $token = $user->createToken($data['device_name'] ?? 'rms-web')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->load('roles.permissions'),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('roles.permissions'));
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }
}
