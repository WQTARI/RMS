<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\MenuItemController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PrepSectionController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\RestaurantTableController;
use App\Http\Controllers\Api\TableSectionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\SettingController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request; // Added for the /user route

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::get('/settings', [SettingController::class, 'branding']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::middleware('permission:view_only,view_limited_archive,update_item_status')->group(function () {
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/{id}', [OrderController::class, 'show']);
    });

    Route::middleware('permission:view_only')->group(function () {
        Route::get('/table-sections', [TableSectionController::class, 'index']);
        Route::get('/prep-sections', [PrepSectionController::class, 'index']);
        Route::get('/tables', [RestaurantTableController::class, 'index']);
        Route::get('/tables/{id}', [RestaurantTableController::class, 'show']);
        Route::get('/reservations', [ReservationController::class, 'index']);
        Route::get('/reservations/{id}', [ReservationController::class, 'show']);
        Route::get('/menu-items', [MenuItemController::class, 'index']);
        Route::get('/menu-items/{id}', [MenuItemController::class, 'show']);
        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    });

    Route::middleware('permission:manage_settings')->group(function () {
        Route::apiResource('table-sections', TableSectionController::class)->except(['index', 'show']);
        Route::apiResource('prep-sections', PrepSectionController::class)->except(['index', 'show']);
        Route::apiResource('menu-items', MenuItemController::class)->except(['index', 'show']);
        Route::apiResource('users', UserController::class);
        Route::post('/tables', [RestaurantTableController::class, 'store']);
        Route::put('/tables/{id}', [RestaurantTableController::class, 'update']);
        Route::delete('/tables/{id}', [RestaurantTableController::class, 'destroy']);
        Route::get('/roles', [RoleController::class, 'index']);
        Route::get('/audits', [AuditController::class, 'index']);

        // Restaurant Settings
        Route::put('/settings', [SettingController::class, 'update']);
        Route::post('/settings/upload-logo', [SettingController::class, 'uploadLogo']);
    });

    Route::middleware('permission:manage_reservations')->group(function () {
        Route::post('/reservations', [ReservationController::class, 'store']);
        Route::put('/reservations/{id}', [ReservationController::class, 'update']);
        Route::delete('/reservations/{id}', [ReservationController::class, 'destroy']);
        Route::post('/reservations/{id}/convert', [ReservationController::class, 'convertToOrder']);
    });


    Route::middleware('permission:create_order')->group(function () {
        Route::post('/orders', [OrderController::class, 'store']);
        Route::post('/orders/{id}/confirm', [OrderController::class, 'confirm']);
        Route::post('/invoices', [InvoiceController::class, 'store']);
    });

    Route::middleware('permission:modify_order_content')->group(function () {
        Route::put('/orders/{id}', [OrderController::class, 'update']);
        Route::delete('/orders/{id}', [OrderController::class, 'destroy']);
        Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel']);
    });

    Route::middleware('permission:update_item_status')->group(function () {
        Route::patch('/order-items/{id}/status', [OrderController::class, 'updateItemStatus']);
    });

    Route::middleware('permission:serve_items')->group(function () {
        Route::post('/order-items/{id}/serve', [OrderController::class, 'serveItem']);
    });

    Route::middleware('permission:close_invoice')->group(function () {
        Route::put('/invoices/{id}', [InvoiceController::class, 'update']);
        Route::delete('/invoices/{id}', [InvoiceController::class, 'destroy']);
    });

    Route::middleware('permission:view_reports')->group(function () {
        Route::get('/reports/daily-sales', [ReportController::class, 'dailySales']);
        Route::get('/reports/monthly-sales', [ReportController::class, 'monthlySales']);
        Route::get('/reports/sales-by-section', [ReportController::class, 'salesBySection']);
        Route::get('/reports/top-items', [ReportController::class, 'topItems']);
        Route::get('/reports/reservations', [ReportController::class, 'reservations']);
        Route::get('/reports/table-performance', [ReportController::class, 'tablePerformance']);
        Route::get('/reports/sales-trend', [ReportController::class, 'salesTrend']);
        Route::get('/reports/reservation-stats', [ReportController::class, 'reservationStats']);
    });
});
