<?php

namespace App\Models;

use App\Enums\ReservationStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_name',
        'phone',
        'date_time',
        'duration_minutes',
        'number_of_guests',
        'table_id',
        'status',
        'notes',
    ];

    protected $casts = [
        'date_time' => 'datetime',
        'status' => ReservationStatus::class,
    ];

    public function table(): BelongsTo
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }

    public function order(): HasOne
    {
        return $this->hasOne(Order::class);
    }
}
