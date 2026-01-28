<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get exact foreign key names
        $menuItemsFk = DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu_items' AND COLUMN_NAME = 'prep_section_id' AND REFERENCED_TABLE_NAME IS NOT NULL");
        $tablesFk = DB::select("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restaurant_tables' AND COLUMN_NAME = 'section_id' AND REFERENCED_TABLE_NAME IS NOT NULL");

        // Drop existing foreign keys if they exist
        if (!empty($menuItemsFk)) {
            DB::statement("ALTER TABLE menu_items DROP FOREIGN KEY {$menuItemsFk[0]->CONSTRAINT_NAME}");
        }
        
        if (!empty($tablesFk)) {
            DB::statement("ALTER TABLE restaurant_tables DROP FOREIGN KEY {$tablesFk[0]->CONSTRAINT_NAME}");
        }

        // Add new foreign keys with CASCADE delete
        DB::statement("ALTER TABLE menu_items ADD CONSTRAINT menu_items_prep_section_id_foreign FOREIGN KEY (prep_section_id) REFERENCES prep_sections(id) ON DELETE CASCADE");
        DB::statement("ALTER TABLE restaurant_tables ADD CONSTRAINT restaurant_tables_section_id_foreign FOREIGN KEY (section_id) REFERENCES table_sections(id) ON DELETE CASCADE");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop CASCADE foreign keys
        DB::statement("ALTER TABLE menu_items DROP FOREIGN KEY menu_items_prep_section_id_foreign");
        DB::statement("ALTER TABLE restaurant_tables DROP FOREIGN KEY restaurant_tables_section_id_foreign");

        // Restore original foreign keys without cascade
        DB::statement("ALTER TABLE menu_items ADD CONSTRAINT menu_items_prep_section_id_foreign FOREIGN KEY (prep_section_id) REFERENCES prep_sections(id)");
        DB::statement("ALTER TABLE restaurant_tables ADD CONSTRAINT restaurant_tables_section_id_foreign FOREIGN KEY (section_id) REFERENCES table_sections(id)");
    }
};
