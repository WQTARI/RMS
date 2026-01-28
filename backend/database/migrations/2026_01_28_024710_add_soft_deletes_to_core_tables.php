<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('restaurant_tables', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('prep_sections', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('table_sections', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('restaurant_tables', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('prep_sections', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('table_sections', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
