<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\MenuItem;
use App\Models\OrderItem;
use App\Models\Reservation;
use App\Models\RestaurantTable;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function dailySales()
    {
        $date = request('date') ? Carbon::parse(request('date')) : Carbon::today();

        $total = Cache::remember(
            'reports:daily-sales:' . $date->toDateString(),
            now()->addMinutes(2),
            fn() => Invoice::where('status', \App\Enums\InvoiceStatus::Paid)
                ->whereDate('closed_at', $date)
                ->sum('total')
        );

        return response()->json([
            'date' => $date->toDateString(),
            'total' => $total,
        ]);
    }

    public function monthlySales()
    {
        $month = request('month') ? Carbon::parse(request('month')) : Carbon::now();

        $key = sprintf('reports:monthly-sales:%s-%s', $month->year, $month->month);
        $total = Cache::remember(
            $key,
            now()->addMinutes(5),
            fn() => Invoice::where('status', \App\Enums\InvoiceStatus::Paid)
                ->whereYear('closed_at', $month->year)
                ->whereMonth('closed_at', $month->month)
                ->sum('total')
        );

        return response()->json([
            'month' => $month->format('Y-m'),
            'total' => $total,
        ]);
    }

    public function salesBySection()
    {
        $rows = Cache::remember(
            'reports:sales-by-section',
            now()->addMinutes(5),
            fn() => DB::table('order_items')
                ->join('prep_sections', 'order_items.prep_section_id', '=', 'prep_sections.id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->join('invoices', 'orders.invoice_id', '=', 'invoices.id')
                ->where('invoices.status', \App\Enums\InvoiceStatus::Paid->value)
                ->select('prep_sections.name', DB::raw('SUM(order_items.price * order_items.quantity) as total'))
                ->groupBy('prep_sections.name')
                ->orderByDesc('total')
                ->get()
        );

        return response()->json($rows);
    }

    public function topItems()
    {
        $limit = (int) (request('limit') ?? 10);

        $rows = Cache::remember(
            'reports:top-items:' . $limit,
            now()->addMinutes(5),
            fn() => OrderItem::query()
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->join('invoices', 'orders.invoice_id', '=', 'invoices.id')
                ->where('invoices.status', \App\Enums\InvoiceStatus::Paid)
                ->select('order_items.menu_item_id', DB::raw('SUM(order_items.quantity) as qty'))
                ->groupBy('order_items.menu_item_id')
                ->orderByDesc('qty')
                ->with('menuItem')
                ->limit($limit)
                ->get()
        );

        return response()->json($rows);
    }

    public function reservations()
    {
        $date = request('date') ? Carbon::parse(request('date')) : Carbon::today();

        $rows = Cache::remember(
            'reports:reservations:' . $date->toDateString(),
            now()->addMinutes(2),
            fn() => Reservation::with('table.section')
                ->whereDate('date_time', $date)
                ->orderBy('date_time')
                ->get()
        );

        return response()->json($rows);
    }

    public function tablePerformance()
    {
        $rows = Cache::remember(
            'reports:table-performance',
            now()->addMinutes(5),
            function () {
                // 1. Fetch performance for physical tables
                $tables = RestaurantTable::withCount([
                    'orders' => function ($q) {
                        $q->whereHas('invoice', fn($iq) => $iq->where('status', \App\Enums\InvoiceStatus::Paid));
                    },
                    'invoices' => function ($q) {
                        $q->where('status', \App\Enums\InvoiceStatus::Paid);
                    }
                ])
                ->withSum([
                    'invoices' => function ($q) {
                        $q->where('status', \App\Enums\InvoiceStatus::Paid);
                    }
                ], 'total')
                ->get()
                ->map(function ($table) {
                    $table->avg_order_value = $table->invoices_count > 0
                        ? round($table->invoices_sum_total / $table->invoices_count, 2)
                        : 0;
                    return $table;
                });

                // 2. Calculate Takeaway performance (No Table ID)
                $takeawayInvoices = Invoice::where('status', \App\Enums\InvoiceStatus::Paid)
                    ->whereNull('table_id')
                    ->get();

                $takeawayTotalRevenue = $takeawayInvoices->sum('total');
                $takeawayInvoiceCount = $takeawayInvoices->count();
                
                // Count orders associated with these takeaway invoices
                $takeawayOrderCount = DB::table('orders')
                    ->join('invoices', 'orders.invoice_id', '=', 'invoices.id')
                    ->whereIn('invoices.id', $takeawayInvoices->pluck('id'))
                    ->count();

                // Create a virtual "Takeaway" table object
                $takeawayStats = new RestaurantTable([
                    'name' => 'Takeaway',
                    'capacity' => 0,
                    'status' => \App\Enums\TableStatus::Available,
                ]);
                // Manually set attributes that normally come from relations/aggregates
                $takeawayStats->id = 999999; // Virtual ID for key
                $takeawayStats->orders_count = $takeawayOrderCount;
                $takeawayStats->invoices_count = $takeawayInvoiceCount;
                $takeawayStats->invoices_sum_total = $takeawayTotalRevenue;
                $takeawayStats->avg_order_value = $takeawayInvoiceCount > 0 
                    ? round($takeawayTotalRevenue / $takeawayInvoiceCount, 2) 
                    : 0;

                // 3. Merge and Sort
                $tables->push($takeawayStats);
                
                return $tables->sortByDesc('invoices_sum_total')->values();
            }
        );

        return response()->json($rows);
    }

    public function salesTrend()
    {
        $days = (int) (request('days') ?? 30);

        $results = Cache::remember(
            'reports:sales-trend:' . $days,
            now()->addMinutes(5),
            fn() => Invoice::where('status', \App\Enums\InvoiceStatus::Paid)
                ->where('closed_at', '>=', now()->subDays($days))
                ->select(DB::raw('DATE(closed_at) as date'), DB::raw('SUM(total) as total'))
                ->groupBy('date')
                ->orderBy('date')
                ->get()
        );

        return response()->json($results);
    }

    public function reservationStats()
    {
        $days = (int) (request('days') ?? 30);

        $stats = Cache::remember(
            'reports:reservation-stats:' . $days,
            now()->addMinutes(5),
            fn() => [
                'by_status' => Reservation::where('created_at', '>=', now()->subDays($days))
                    ->select('status', DB::raw('count(*) as count'))
                    ->groupBy('status')
                    ->get(),
                'total_guests' => (int) Reservation::where('created_at', '>=', now()->subDays($days))
                    ->whereIn('status', [\App\Enums\ReservationStatus::Arrived, \App\Enums\ReservationStatus::Seated, \App\Enums\ReservationStatus::Completed])
                    ->sum('number_of_guests'),
                'total_reservations' => Reservation::where('created_at', '>=', now()->subDays($days))->count(),
            ]
        );

        return response()->json($stats);
    }
}
