<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class ReportCacheService
{
    public function clearDailySales(Carbon $date): void
    {
        Cache::forget('reports:daily-sales:' . $date->toDateString());
    }

    public function clearMonthlySales(Carbon $date): void
    {
        $key = sprintf('reports:monthly-sales:%s-%s', $date->year, $date->month);
        Cache::forget($key);
    }

    public function clearReservations(Carbon $date): void
    {
        Cache::forget('reports:reservations:' . $date->toDateString());
    }

    public function clearSalesAggregates(): void
    {
        Cache::forget('reports:sales-by-section');
        Cache::forget('reports:top-items:10');
    }

    public function clearTablePerformance(): void
    {
        Cache::forget('reports:table-performance');
    }
}
