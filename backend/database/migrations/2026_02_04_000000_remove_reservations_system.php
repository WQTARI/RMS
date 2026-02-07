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
        // Remove foreign key from orders and the reservation_id column
        if (Schema::hasColumn('orders', 'reservation_id')) {
            Schema::table('orders', function (Blueprint $table) {
                // In Laravel 11, dropForeign followed by dropColumn on SQLite 
                // should work if not wrapped in a driver check, 
                // because Laravel will recreate the table correctly.
                try {
                    $table->dropForeign(['reservation_id']);
                } catch (\Exception $e) {
                }
                $table->dropColumn('reservation_id');
            });
        }

        // Drop the reservations table
        Schema::dropIfExists('reservations');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->string('customer_name');
            $table->string('phone');
            $table->dateTime('date_time');
            $table->integer('duration_minutes');
            $table->integer('number_of_guests');
            $table->foreignId('table_id')->nullable()->constrained('restaurant_tables')->onDelete('cascade');
            $table->string('status')->default('CREATED');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('reservation_id')->nullable()->after('table_id')->constrained('reservations')->onDelete('set null');
        });
    }
};
