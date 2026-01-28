<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
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
            $table->foreign('reservation_id')->references('id')->on('reservations');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['table_id']);
            $table->dropForeign(['reservation_id']);
        });

        Schema::table('reservations', function (Blueprint $table) {
            $table->dropForeign(['table_id']);
        });
    }
};
