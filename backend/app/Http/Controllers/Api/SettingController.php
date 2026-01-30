<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    public function index()
    {
        return response()->json(
            Setting::pluck('value', 'key')->all()
        );
    }

    public function update(Request $request)
    {
        $request->validate([
            'settings' => 'required|array',
            'settings.restaurant_name' => 'nullable|string|max:255',
            'settings.restaurant_logo' => 'nullable|string', // Base64 or URL
        ]);

        foreach ($request->settings as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value]
            );
        }

        return response()->json([
            'message' => 'Settings updated successfully',
            'settings' => Setting::pluck('value', 'key')->all()
        ]);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            $url = Storage::url($path);

            Setting::updateOrCreate(
                ['key' => 'restaurant_logo'],
                ['value' => $url]
            );

            return response()->json([
                'url' => $url,
                'message' => 'Logo uploaded successfully'
            ]);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }
}
