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
            // Get exact foreign key name for orders.reservation_id
            $fk = DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'reservation_id' AND REFERENCED_TABLE_NAME IS NOT NULL");

            if (!empty($fk)) {
                DB::statement("ALTER TABLE orders DROP FOREIGN KEY {$fk[0]->CONSTRAINT_NAME}");
            }

            // Add foreign key with ON DELETE SET NULL
            DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_reservation_id_foreign FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE orders DROP FOREIGN KEY orders_reservation_id_foreign");

            // Restore default restricted foreign key
            DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_reservation_id_foreign FOREIGN KEY (reservation_id) REFERENCES reservations(id)");
        }
    }
};
