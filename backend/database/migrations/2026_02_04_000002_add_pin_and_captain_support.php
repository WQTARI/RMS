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
        Schema::table('users', function (Blueprint $table) {
            $table->string('pin', 60)->nullable()->after('password');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('captain_id')->nullable()->after('created_by')->constrained('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (DB::getDriverName() !== 'sqlite') {
                $table->dropForeign(['captain_id']);
            }
            $table->dropColumn('captain_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('pin');
        });
    }
};
