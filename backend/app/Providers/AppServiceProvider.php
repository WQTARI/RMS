<?php

namespace App\Providers;

use App\Models\Order;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \App\Models\Order::observe(\App\Observers\OrderObserver::class);
        \App\Models\Invoice::observe(\App\Observers\InvoiceObserver::class);
        \App\Models\Reservation::observe(\App\Observers\ReservationObserver::class);

        // System Audit Observers
        \App\Models\User::observe(\App\Observers\UserObserver::class);
        \App\Models\MenuItem::observe(\App\Observers\MenuItemObserver::class);
        \App\Models\PrepSection::observe(\App\Observers\PrepSectionObserver::class);
        \App\Models\TableSection::observe(\App\Observers\TableSectionObserver::class);
        \App\Models\RestaurantTable::observe(\App\Observers\RestaurantTableObserver::class);

        Order::addGlobalScope('withKitchenRelations', function ($builder) {
            $builder->with(['items.menuItem', 'reservation']);
        });

        // Register all permissions as Gates dynamically from the database
        $permissions = \Illuminate\Support\Facades\Cache::remember('system_permissions', 86400, function () {
            try {
                return \App\Models\Permission::pluck('name')->toArray();
            } catch (\Exception $e) {
                // Fallback for migrations/setup
                return [];
            }
        });

        foreach ($permissions as $permission) {
            \Illuminate\Support\Facades\Gate::define($permission, function ($user) use ($permission) {
                return $user->hasPermission($permission);
            });
        }

        RateLimiter::for('login', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perMinute(10)->by($request->input('email', $request->ip())),
            ];
        });
    }
}
