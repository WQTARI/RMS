<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class PinVerificationController extends Controller
{
    /**
     * Verify captain PIN.
     */
    public function verify(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'pin' => ['required', 'string', 'size:4'],
        ]);

        $user = User::findOrFail($data['user_id']);

        // Check if PIN matches
        if (!\Illuminate\Support\Facades\Hash::check($data['pin'], $user->pin)) {
            return response()->json([
                'valid' => false,
                'message' => 'Invalid PIN',
            ], 401);
        }

        return response()->json([
            'valid' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * Get all captains (users with PINs).
     */
    public function getCaptains()
    {
        $captains = User::whereNotNull('pin')
            ->select('id', 'name', 'email')
            ->get();

        return response()->json($captains);
    }
}
