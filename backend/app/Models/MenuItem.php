<?php

namespace App\Models;

use App\Enums\MenuCategory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MenuItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'price',
        'description',
        'image_url',
        'category',
        'prep_section_id',
        'prep_time_minutes',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'prep_time_minutes' => 'integer',
        'is_active' => 'boolean',
    ];

    public function prepSection(): BelongsTo
    {
        return $this->belongsTo(PrepSection::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
