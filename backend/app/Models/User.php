<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'is_active',
        'prep_section_id',
        'pin',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'pin',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'prep_section_id' => 'integer',
        ];
    }

    public function setPinAttribute($value)
    {
        if ($value) {
            $this->attributes['pin'] = \Illuminate\Support\Facades\Hash::make($value);
        } else {
            $this->attributes['pin'] = null;
        }
    }

    public function verifyPin(string $pin): bool
    {
        return \Illuminate\Support\Facades\Hash::check($pin, $this->pin);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_user');
    }

    public function prepSection(): BelongsTo
    {
        return $this->belongsTo(PrepSection::class);
    }

    public function hasPermission(string $permission): bool
    {
        return $this->roles()
            ->whereHas('permissions', fn($query) => $query->where('name', $permission))
            ->exists();
    }

    public function syncPrepSectionFromRoles(): void
    {
        if ($this->prep_section_id)
            return;

        $roleNames = $this->roles->pluck('name')->toArray();
        $section = \App\Models\PrepSection::whereIn('name', $roleNames)->first();

        if ($section) {
            $this->prep_section_id = $section->id;
            $this->saveQuietly();
        }
    }
}
