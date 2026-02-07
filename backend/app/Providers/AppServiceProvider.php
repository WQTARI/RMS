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
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Order::class, \App\Policies\OrderPolicy::class);

        \App\Models\Order::observe(\App\Observers\OrderObserver::class);
        \App\Models\Invoice::observe(\App\Observers\InvoiceObserver::class);

        // System Audit Observers
        \App\Models\User::observe(\App\Observers\UserObserver::class);
        \App\Models\MenuItem::observe(\App\Observers\MenuItemObserver::class);
        \App\Models\PrepSection::observe(\App\Observers\PrepSectionObserver::class);
        \App\Models\TableSection::observe(\App\Observers\TableSectionObserver::class);
        \App\Models\RestaurantTable::observe(\App\Observers\RestaurantTableObserver::class);

        Order::addGlobalScope('withKitchenRelations', function ($builder) {
            $builder->with(['items.menuItem']);
        });

        RateLimiter::for('login', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perMinute(10)->by($request->input('email', $request->ip())),
            ];
        });
    }
}
