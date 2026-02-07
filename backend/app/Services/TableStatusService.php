<?php

namespace App\Services;

use App\Models\RestaurantTable;
use Illuminate\Support\Facades\Cache;

class TableStatusService
{
    private const DEBOUNCE_SECONDS = 2;

    /**
     * Update table status with debouncing to prevent excessive broadcasts.
     */
    public function updateStatus(RestaurantTable $table): void
    {
        $cacheKey = "table_status_update:{$table->id}";

        // Check if we recently updated this table
        if (Cache::has($cacheKey)) {
            // Schedule update for later instead of immediate broadcast
            Cache::put("table_status_pending:{$table->id}", true, now()->addSeconds(self::DEBOUNCE_SECONDS + 1));
            return;
        }

        // Mark that we're updating this table
        Cache::put($cacheKey, true, now()->addSeconds(self::DEBOUNCE_SECONDS));

        // Perform the actual status update
        $this->performStatusUpdate($table);

        // Schedule a follow-up check for pending updates
        dispatch(function () use ($table) {
            sleep(self::DEBOUNCE_SECONDS);

            if (Cache::pull("table_status_pending:{$table->id}")) {
                $this->performStatusUpdate($table->fresh());
            }
        })->afterResponse();
    }

    /**
     * Perform the actual status update and broadcast.
     */
    private function performStatusUpdate(RestaurantTable $table): void
    {
        $table->loadMissing(['orders.items', 'orders.invoice']);

        $startTime = microtime(true);

        // Calculate and cache the status
        $status = $table->getStatusAttribute();

        $duration = (microtime(true) - $startTime) * 1000;

        StructuredLogger::performance('table_status_calculation', $duration, [
            'table_id' => $table->id,
            'status' => $status->value,
        ]);

        // Broadcast the update
        \App\Events\TableStatusUpdated::dispatchSafe($table);

        StructuredLogger::tableEvent('status_updated', [
            'table_id' => $table->id,
            'status' => $status->value,
        ]);
    }
}
