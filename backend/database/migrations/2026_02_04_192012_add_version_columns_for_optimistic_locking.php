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
        // Add version columns for optimistic locking
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('version')->default(1)->after('notes');
            $table->index(['table_id', 'status']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedInteger('version')->default(1)->after('closed_by');
            $table->index(['table_id', 'status']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->index(['order_id', 'status']);
            $table->index('prep_section_id');
        });

        Schema::table('restaurant_tables', function (Blueprint $table) {
            $table->index(['section_id', 'deleted_at']);
        });

        // Add idempotency key for payments
        Schema::table('invoice_payments', function (Blueprint $table) {
            $table->string('idempotency_key', 64)->nullable()->unique()->after('invoice_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('version');
            $table->dropIndex(['table_id', 'status']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('version');
            $table->dropIndex(['table_id', 'status']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['order_id', 'status']);
            $table->dropIndex(['prep_section_id']);
        });

        Schema::table('restaurant_tables', function (Blueprint $table) {
            $table->dropIndex(['section_id', 'deleted_at']);
        });

        Schema::table('invoice_payments', function (Blueprint $table) {
            $table->dropColumn('idempotency_key');
        });
    }
};
