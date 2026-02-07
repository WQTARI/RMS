<?php

namespace App\Providers;

use App\Services\StructuredLogger;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

class QueryPerformanceServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Log slow queries in production
        if (app()->environment('production')) {
            DB::listen(function (QueryExecuted $query) {
                StructuredLogger::queryPerformance(
                    $query->sql,
                    $query->time,
                    $query->bindings
                );
            });
        }
    }
}
