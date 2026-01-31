<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Services\OrderService;
use App\Services\ReportCacheService;
use App\Services\ReservationService;
use App\Services\TableStatusService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReservationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Reservation::class);

        $request->validate([
            'status' => ['nullable', 'string', Rule::enum(ReservationStatus::class)],
            'date' => ['nullable', 'date'],
        ]);

        $query = Reservation::with('table.section')->orderBy('date_time');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('date')) {
            $query->whereDate('date_time', $request->input('date'));
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorize('create', Reservation::class);
        $data = $request->validate([
            'customer_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'date_time' => ['required', 'date', 'after_or_equal:today -1 month'], // Allow past recording but Service will handle drift
            'duration_minutes' => ['nullable', 'integer', 'min:0'],
            'number_of_guests' => ['required', 'integer', 'min:1'],
            'table_id' => ['required', 'exists:restaurant_tables,id'],
            'notes' => ['nullable', 'string'],
        ]);

        $start = Carbon::parse($data['date_time']);
        $duration = $data['duration_minutes'] ?? 90;

        $reservationService = app(ReservationService::class);
        if ($reservationService->hasOverlap($data['table_id'], $start, $duration)) {
            return response()->json(['message' => 'Reservation overlaps existing booking'], 422);
        }

        $data['duration_minutes'] = $duration;

        $reservation = $reservationService->createReservation($data);
        app(ReportCacheService::class)->clearReservations(Carbon::parse($reservation->date_time));

        return response()->json($reservation->load('table.section'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $reservation = Reservation::with('table.section')->findOrFail($id);
        $this->authorize('view', $reservation);

        return response()->json($reservation);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $reservation = Reservation::findOrFail($id);
        $this->authorize('update', $reservation);

        $data = $request->validate([
            'customer_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:50'],
            'date_time' => ['sometimes', 'date', 'after_or_equal:now'],
            'duration_minutes' => ['nullable', 'integer', 'min:0'],
            'number_of_guests' => ['sometimes', 'integer', 'min:1'],
            'table_id' => ['sometimes', 'exists:restaurant_tables,id'],
            'status' => ['nullable', Rule::enum(ReservationStatus::class)],
            'notes' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($data, $reservation) {
            if (isset($data['date_time']) || isset($data['table_id'])) {
                $start = Carbon::parse($data['date_time'] ?? $reservation->date_time);
                $duration = $data['duration_minutes'] ?? $reservation->duration_minutes;
                $tableId = $data['table_id'] ?? $reservation->table_id;

                app(ReservationService::class)->assertNoOverlapForUpdate(
                    $reservation->id,
                    $tableId,
                    $start,
                    (int) $duration
                );
            }

            if (isset($data['status']) && $data['status'] === ReservationStatus::Completed->value) {
                // Prevent completing if there is an open invoice
                $hasOpenInvoice = \App\Models\Invoice::where('table_id', $reservation->table_id)
                    ->where('status', \App\Enums\InvoiceStatus::Open)
                    ->exists();

                if ($hasOpenInvoice) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'status' => 'لا يمكن إنهاء الجلسة. الفاتورة لا تزال مفتوحة لهذا العميل.',
                    ]);
                }

                // Calculate duration for undefined reservations
                if ($reservation->duration_minutes === 0) {
                    $data['duration_minutes'] = max(5, \Carbon\Carbon::parse($reservation->date_time)->diffInMinutes(now()));
                }
            }

            $reservation->update($data);
        });
        app(ReportCacheService::class)->clearReservations(Carbon::parse($reservation->date_time));

        return response()->json($reservation->load('table.section'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $reservation = Reservation::findOrFail($id);
        $this->authorize('delete', $reservation);

        $reservationDate = Carbon::parse($reservation->date_time);
        
        // Prevent deleting if there is an open invoice
        $hasOpenInvoice = \App\Models\Invoice::where('table_id', $reservation->table_id)
            ->where('status', \App\Enums\InvoiceStatus::Open)
            ->exists();

        if ($hasOpenInvoice) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'id' => 'لا يمكن حذف الحجز. الفاتورة لا تزال مفتوحة لهذه الطاولة.',
            ]);
        }

        $reservation->delete();

        app(ReportCacheService::class)->clearReservations($reservationDate);

        return response()->json(['message' => 'Deleted']);
    }

    public function convertToOrder(Request $request, string $id)
    {
        $reservation = Reservation::findOrFail($id);
        $this->authorize('update', $reservation);

        if (app(\App\Services\ReservationService::class)->hasOverlap($reservation->table_id, now(), 1, true, $reservation->id)) {
            return response()->json(['message' => 'Table is currently occupied or reserved by another booking.'], 422);
        }

        $payload = $request->validate([
            'items' => ['nullable', 'array'],
            'items.*.menu_item_id' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.notes' => ['nullable', 'string'],
        ]);

        $order = app(OrderService::class)->createOrder([
            'table_id' => $reservation->table_id,
            'customer_name' => $reservation->customer_name, // Explicitly pass for invoice labeling
            'reservation_id' => $reservation->id,
            'notes' => $reservation->notes,
            'items' => $payload['items'] ?? [],
            'created_by' => $request->user()?->id,
        ]);

        // Explicitly confirm the order since the guest has arrived (conversion action)
        $order->update(['confirmed_at' => now()]);

        // Update reservation status to SEATED
        $reservation->update(['status' => ReservationStatus::Seated]);

        return response()->json($order->load('items.menuItem', 'table.section'));
    }
}
