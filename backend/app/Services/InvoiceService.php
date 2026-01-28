<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\OrderStatus;
use App\Events\InvoiceClosed;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\Order;
use App\Services\ReportCacheService;
use App\Services\TableStatusService;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function openInvoice(?int $tableId, ?string $customerName = null): Invoice
    {
        if ($tableId === null) {
            return Invoice::create([
                'table_id' => null,
                'customer_name' => $customerName,
                'status' => InvoiceStatus::Open,
                'subtotal' => 0,
                'tax' => 0,
                'discount' => 0,
                'total' => 0,
            ]);
        }

        return Invoice::firstOrCreate(
            ['table_id' => $tableId, 'status' => InvoiceStatus::Open],
            ['customer_name' => $customerName, 'subtotal' => 0, 'tax' => 0, 'discount' => 0, 'total' => 0]
        );
    }

    public function closeInvoice(Invoice $invoice, array $payments, float $tax, float $discount, ?int $closedBy): Invoice
    {
        if ($invoice->status === InvoiceStatus::Paid) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'status' => 'Invoice is already paid.',
            ]);
        }

        return DB::transaction(function () use ($invoice, $payments, $tax, $discount, $closedBy) {
            $orders = Order::where('table_id', $invoice->table_id)
                ->whereIn('status', [OrderStatus::Open, OrderStatus::InProgress, OrderStatus::Ready])
                ->with('items')
                ->get();

            $subtotal = $orders->flatMap->items->sum(function ($item) {
                return $item->price * $item->quantity;
            });

            $total = max(0, ($subtotal + $tax) - $discount);

            $invoice->update([
                'status' => InvoiceStatus::Paid,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'discount' => $discount,
                'total' => $total,
                'closed_at' => now(),
                'closed_by' => $closedBy,
            ]);

            foreach ($orders as $order) {
                $order->invoice()->associate($invoice);
                $order->setRelation('invoice', $invoice);
                $order->save();

                Order::allowStatusWrite(fn() => $order->update([
                    'status' => OrderStatus::Closed,
                    'closed_at' => now(),
                ]));

                \App\Models\OrderAudit::create([
                    'order_id' => $order->id,
                    'user_id' => $closedBy,
                    'action' => 'invoice_closed_payment',
                    'previous_status' => OrderStatus::Ready->value,
                    'new_status' => OrderStatus::Closed->value,
                    'reason' => 'Order paid and invoice closed.',
                    'occurred_at' => now(),
                ]);
            }

            foreach ($payments as $payment) {
                InvoicePayment::create([
                    'invoice_id' => $invoice->id,
                    'method' => $payment['method'],
                    'amount' => $payment['amount'],
                    'paid_at' => now(),
                ]);
            }

            DB::afterCommit(function () use ($invoice) {
                \App\Events\InvoiceClosed::dispatchSafe($invoice->load('payments'));
                $table = $invoice->relationLoaded('table') ? $invoice->table : $invoice->load('table')->table;
                if ($table instanceof \App\Models\RestaurantTable) {
                    app(TableStatusService::class)->updateStatus($table);
                }
                if ($invoice->closed_at) {
                    $date = $invoice->closed_at;
                    app(ReportCacheService::class)->clearDailySales($date);
                    app(ReportCacheService::class)->clearMonthlySales($date);
                }
                app(ReportCacheService::class)->clearSalesAggregates();
                app(ReportCacheService::class)->clearTablePerformance();
            });

            return $invoice->refresh();
        });
    }
}
