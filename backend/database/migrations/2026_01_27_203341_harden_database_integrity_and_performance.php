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
        // 1. Performance Layer: Strategic Indices
        Schema::table('orders', function (Blueprint $table) {
            $table->index('created_at', 'orders_created_at_idx');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->index('created_at', 'invoices_created_at_idx');
        });

        Schema::table('invoice_payments', function (Blueprint $table) {
            $table->index('paid_at', 'payments_paid_at_idx');
        });

        Schema::table('menu_items', function (Blueprint $table) {
            $table->index(['category', 'is_active'], 'menu_items_pos_idx');
        });

        // 2. Integrity Layer: CHECK Constraints (MySQL 8.0.16+)
        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_qty_check CHECK (quantity > 0)');
        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_price_check CHECK (price >= 0)');
        DB::statement('ALTER TABLE menu_items ADD CONSTRAINT menu_items_price_check CHECK (price >= 0)');
        DB::statement('ALTER TABLE invoice_payments ADD CONSTRAINT payments_amount_check CHECK (amount > 0)');

        // 3. Relational Safeguards: Set NULL on table deletion to preserve history
        // First drop existing FKs defensively
        try {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropForeign(['table_id']);
            });
        } catch (\Exception $e) {
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('table_id')
                ->references('id')
                ->on('restaurant_tables')
                ->nullOnDelete();
        });

        try {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropForeign(['table_id']);
            });
        } catch (\Exception $e) {
        }

        Schema::table('invoices', function (Blueprint $table) {
            $table->foreign('table_id')
                ->references('id')
                ->on('restaurant_tables')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            try {
                $table->dropForeign(['table_id']);
            } catch (\Exception $e) {
            }
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->foreign('table_id')
                ->references('id')
                ->on('restaurant_tables');
            $table->dropIndex('invoices_created_at_idx');
        });

        Schema::table('orders', function (Blueprint $table) {
            try {
                $table->dropForeign(['table_id']);
            } catch (\Exception $e) {
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('table_id')
                ->references('id')
                ->on('restaurant_tables');
            $table->dropIndex('orders_created_at_idx');
        });

        try {
            DB::statement('ALTER TABLE order_items DROP CHECK order_items_qty_check');
        } catch (\Exception $e) {
        }
        try {
            DB::statement('ALTER TABLE order_items DROP CHECK order_items_price_check');
        } catch (\Exception $e) {
        }
        try {
            DB::statement('ALTER TABLE menu_items DROP CHECK menu_items_price_check');
        } catch (\Exception $e) {
        }
        try {
            DB::statement('ALTER TABLE invoice_payments DROP CHECK payments_amount_check');
        } catch (\Exception $e) {
        }

        Schema::table('invoice_payments', function (Blueprint $table) {
            $table->dropIndex('payments_paid_at_idx');
        });

        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropIndex('menu_items_pos_idx');
        });
    }
};