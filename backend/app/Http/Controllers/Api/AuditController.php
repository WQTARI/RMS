<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderAudit;
use App\Models\SystemAudit;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $page = $request->input('page', 1);
        $perPage = 50;

        // Get both order audits and system audits
        $orderAudits = OrderAudit::with(['order.table', 'user'])
            ->get()
            ->map(function ($audit) {
                return [
                    'id' => $audit->id,
                    'type' => 'order',
                    'action' => $audit->action,
                    'description' => $this->formatOrderAuditDescription($audit),
                    'user_name' => $audit->user?->name ?? 'System',
                    'occurred_at' => $audit->occurred_at ?? $audit->created_at,
                    'details' => [
                        'order_id' => $audit->order_id,
                        'table' => $audit->order?->table?->name,
                        'previous_status' => $audit->previous_status,
                        'new_status' => $audit->new_status,
                        'reason' => $audit->reason,
                    ],
                ];
            });

        $systemAudits = SystemAudit::with('user')
            ->get()
            ->map(function ($audit) {
                return [
                    'id' => $audit->id,
                    'type' => 'system',
                    'action' => $audit->action,
                    'description' => $audit->description,
                    'user_name' => $audit->user?->name ?? 'System',
                    'occurred_at' => $audit->created_at,
                    'details' => [
                        'model' => class_basename($audit->auditable_type),
                        'model_id' => $audit->auditable_id,
                        'old_values' => $audit->old_values,
                        'new_values' => $audit->new_values,
                    ],
                ];
            });

        // Merge and sort
        $allAudits = $orderAudits->concat($systemAudits)
            ->sortByDesc('occurred_at')
            ->values();

        // Manual Pagination
        $paginated = new \Illuminate\Pagination\LengthAwarePaginator(
            $allAudits->forPage($page, $perPage)->values(),
            $allAudits->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return response()->json($paginated);
    }

    private function formatOrderAuditDescription($audit): string
    {
        $table = $audit->order?->table?->name ?? 'N/A';
        $order = "الطلب #{$audit->order_id}";
        
        return match($audit->action) {
            'ORDER CREATED' => "{$order} تم الانشاء - {$table}",
            'ORDER CONFIRMED' => "{$order} تم التأكيد - {$table}",
            'ORDER CANCELLED' => "{$order} تم الإلغاء - {$table}",
            'INVOICE CLOSED PAYMENT' => "{$order} تم الدفع وإغلاق الفاتورة - {$table}",
            'HALTING PREPARING' => "{$order} قيد التحضير - {$table}",
            'NEW ORDER INITIATED' => "{$order} تم بدء طلب جديد - {$table}",
            default => $audit->action,
        };
    }
}
