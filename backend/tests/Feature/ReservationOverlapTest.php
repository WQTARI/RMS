<?php

namespace Tests\Feature;

use App\Models\Reservation;
use App\Models\RestaurantTable;
use App\Models\TableSection;
use App\Services\ReservationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ReservationOverlapTest extends TestCase
{
    use RefreshDatabase;

    public function test_reservation_creation_rejects_overlaps(): void
    {
        $section = TableSection::create(['name' => 'Main', 'is_active' => true]);
        $table = RestaurantTable::create([
            'name' => 'T-01',
            'capacity' => 4,
            'section_id' => $section->id,
            'status' => 'AVAILABLE',
        ]);

        Reservation::create([
            'customer_name' => 'Existing',
            'phone' => '123',
            'date_time' => '2026-01-23 18:00:00',
            'duration_minutes' => 60,
            'number_of_guests' => 2,
            'table_id' => $table->id,
            'status' => 'CREATED',
        ]);

        $this->expectException(ValidationException::class);
        app(ReservationService::class)->createReservation([
            'customer_name' => 'Overlap',
            'phone' => '555',
            'date_time' => '2026-01-23 18:30:00',
            'duration_minutes' => 60,
            'number_of_guests' => 2,
            'table_id' => $table->id,
            'status' => 'CREATED',
        ]);
    }
}
