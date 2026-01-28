<?php

namespace App\Traits;

use Illuminate\Support\Facades\Log;

trait SafeBroadcast
{
    /**
     * Dispatch the event safely without risking a 500 error if the broadcaster fails.
     */
    public static function dispatchSafe(...$arguments): void
    {
        try {
            event(new static(...$arguments));
        } catch (\Exception $e) {
            Log::warning('Real-time broadcast failed (SafeBroadcast caught it).', [
                'event' => static::class,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
