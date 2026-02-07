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
        // Drop reservations table completely
        Schema::dropIfExists('reservations');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate reservations table (for rollback purposes)
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('table_id')->constrained('restaurant_tables')->onDelete('cascade');
            $table->string('customer_name');
            $table->string('customer_phone')->nullable();
            $table->integer('guest_count');
            $table->dateTime('reservation_time');
            $table->text('notes')->nullable();
            $table->enum('status', ['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW'])->default('PENDING');
            $table->timestamps();
        });
    }
};
