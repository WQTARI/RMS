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
        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('menu_items', function (Blueprint $table) {
                $table->string('category')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We cannot easily revert back to enum without risking data loss if new categories were added
        // So we keep it as string potentially, or try to revert to default enum values
        Schema::table('menu_items', function (Blueprint $table) {
            // Reverting logic is tricky with Doctrine DBAL and Enums, best to leave as string or manually handle
        });
    }
};
