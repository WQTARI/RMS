<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->foreign('table_id')->references('id')->on('restaurant_tables');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('table_id')->references('id')->on('restaurant_tables');
            // Protect reservation_id FK if it's going to be dropped later anyway, 
            // but for SQLite it's better to avoid complex FK changes if possible.
            $table->foreign('reservation_id')->references('id')->on('reservations');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign(['table_id']);
                $table->dropForeign(['reservation_id']);
            });

            Schema::table('reservations', function (Blueprint $table) {
                $table->dropForeign(['table_id']);
            });
        }
    }
};
