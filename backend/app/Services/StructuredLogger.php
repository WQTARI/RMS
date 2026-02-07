<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class StructuredLogger
{
    /**
     * Log order-related events with structured context.
     */
    public static function orderEvent(string $event, array $context = []): void
    {
        Log::info("order.{$event}", array_merge([
            'timestamp' => now()->toIso8601String(),
        ], $context));
    }

    /**
     * Log invoice-related events with structured context.
     */
    public static function invoiceEvent(string $event, array $context = []): void
    {
        Log::info("invoice.{$event}", array_merge([
            'timestamp' => now()->toIso8601String(),
        ], $context));
    }

    /**
     * Log table-related events with structured context.
     */
    public static function tableEvent(string $event, array $context = []): void
    {
        Log::info("table.{$event}", array_merge([
            'timestamp' => now()->toIso8601String(),
        ], $context));
    }

    /**
     * Log performance metrics.
     */
    public static function performance(string $operation, float $durationMs, array $context = []): void
    {
        $level = $durationMs > 1000 ? 'warning' : 'info';

        Log::$level("performance.{$operation}", array_merge([
            'duration_ms' => round($durationMs, 2),
            'timestamp' => now()->toIso8601String(),
        ], $context));
    }

    /**
     * Log database query performance.
     */
    public static function queryPerformance(string $sql, float $durationMs, array $bindings = []): void
    {
        if ($durationMs > 100) { // Log queries slower than 100ms
            Log::warning('slow_query', [
                'sql' => $sql,
                'duration_ms' => round($durationMs, 2),
                'bindings' => $bindings,
                'timestamp' => now()->toIso8601String(),
            ]);
        }
    }

    /**
     * Log errors with full context.
     */
    public static function error(\Throwable $exception, array $context = []): void
    {
        Log::error('exception', array_merge([
            'message' => $exception->getMessage(),
            'exception' => get_class($exception),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'timestamp' => now()->toIso8601String(),
        ], $context));
    }
}
