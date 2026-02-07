<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use App\Enums\OrderStatus;
use App\Enums\TableStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RestaurantTable extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'capacity',
        'section_id',
        'status',
    ];

    protected $appends = ['status'];

    public function getStatusAttribute($value = null): TableStatus
    {
        // 1. Check for Active Orders/Invoices (Highest Priority - Red)
        $hasConfirmedOrder = $this->orders()
            ->whereIn('status', [
                OrderStatus::Open,
                OrderStatus::InProgress,
                OrderStatus::Ready
            ])
            ->exists();

        $hasOpenInvoice = $this->invoices()
            ->where('status', InvoiceStatus::Open)
            ->exists();

        if ($hasConfirmedOrder || $hasOpenInvoice) {
            return TableStatus::Occupied;
        }

        // 2. Check Database Column (Yellow/Green) - Safely check if it exists in attributes
        if ($this->attributes && array_key_exists('status', $this->attributes) && $this->attributes['status'] === TableStatus::Browsing->value) {
            return TableStatus::Browsing;
        }

        // 3. Fallback: Check for Draft Orders (Yellow)
        $hasDraftOrder = $this->orders()
            ->whereIn('status', [
                OrderStatus::Draft,
                OrderStatus::AwaitingConfirmation
            ])
            ->exists();

        if ($hasDraftOrder) {
            return TableStatus::Browsing;
        }

        return TableStatus::Available;
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(TableSection::class, 'section_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'table_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'table_id');
    }
}
