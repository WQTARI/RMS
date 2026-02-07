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
        Schema::table('prep_sections', function (Blueprint $table) {
            $table->string('printer_ip')->nullable()->after('name');
            $table->integer('printer_port')->default(9100)->after('printer_ip');
            $table->string('printer_name')->nullable()->after('printer_port');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prep_sections', function (Blueprint $table) {
            $table->dropColumn(['printer_ip', 'printer_port', 'printer_name']);
        });
    }
};
