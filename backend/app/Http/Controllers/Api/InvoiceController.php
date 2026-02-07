<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\PaymentMethod;
use App\Models\Invoice;
use App\Services\InvoiceService;
use App\Services\PrinterService;
use App\Services\TableStatusService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Invoice::class);

        $request->validate([
            'table_id' => ['nullable'],
            'status' => ['nullable', 'string', Rule::enum(\App\Enums\InvoiceStatus::class)],
        ]);

        $query = Invoice::with('table.section', 'payments')->orderByDesc('created_at');

        if ($request->has('table_id')) {
            $tid = $request->input('table_id');
            if ($tid === 'null' || $tid === null || $tid === '') {
                $query->whereNull('table_id');
            } else {
                $query->where('table_id', $tid);
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Invoice::class);
        $data = $request->validate([
            'table_id' => ['nullable', 'exists:restaurant_tables,id'],
            'customer_name' => ['nullable', 'string', 'max:255'],
        ]);

        $invoice = app(InvoiceService::class)->openInvoice($data['table_id'], $data['customer_name'] ?? null);

        return response()->json($invoice->load('table.section'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $invoice = Invoice::with('table.section', 'payments', 'orders.items.menuItem')->findOrFail($id);
        $this->authorize('view', $invoice);

        return response()->json($invoice);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $invoice = Invoice::findOrFail($id);
        $this->authorize('update', $invoice);

        $data = $request->validate([
            'tax' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'payments' => ['required', 'array', 'min:1'],
            'payments.*.method' => ['required', Rule::enum(PaymentMethod::class)],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $invoice = app(InvoiceService::class)->closeInvoice(
            $invoice,
            $data['payments'],
            (float) ($data['tax'] ?? 0),
            (float) ($data['discount'] ?? 0),
            $request->user()?->id
        );

        return response()->json($invoice->load('payments', 'table.section', 'orders.items.menuItem'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $invoice = Invoice::findOrFail($id);
        $this->authorize('delete', $invoice);

        $invoice->delete();

        return response()->json(['message' => 'Deleted']);
    }

    /**
     * Get departmental tickets for the invoice.
     */
    public function tickets(string $id)
    {
        $invoice = Invoice::findOrFail($id);
        $this->authorize('view', $invoice);

        $tickets = app(PrinterService::class)->generateTickets($invoice);

        return response()->json($tickets);
    }

    /**
     * Trigger backend printing for kitchen tickets.
     */
    public function printKitchenTickets(Request $request, string $id, PrinterService $printerService)
    {
        $invoice = Invoice::findOrFail($id);
        $this->authorize('view', $invoice);

        try {
            $results = $printerService->printInvoiceTickets($invoice);
            return response()->json(['message' => 'Print jobs processed', 'details' => $results]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Printing failed', 'error' => $e->getMessage()], 500);
        }
    }
}
