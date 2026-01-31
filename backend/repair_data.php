<?php
use App\Models\PrepSection;
use App\Models\MenuItem;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;

// Ensure Drinks section exists
$drinkSection = PrepSection::firstOrCreate(['name' => 'Drinks']);

echo "Drinks Section ID: {$drinkSection->id}\n";

// Fix Menu Items
$updatedMenu = MenuItem::where('category', 'DRINK')
    ->update(['prep_section_id' => $drinkSection->id]);
echo "Updated {$updatedMenu} Menu Items to point to Drinks section.\n";

// Fix Order Items (Historical Fix)
$drinkItemIds = MenuItem::where('category', 'DRINK')->pluck('id');
$updatedOrders = OrderItem::whereIn('menu_item_id', $drinkItemIds)
    ->where('prep_section_id', '!=', $drinkSection->id)
    ->update(['prep_section_id' => $drinkSection->id]);
    
echo "Updated {$updatedOrders} Order Items to point to Drinks section.\n";

// Clear Cache
\Illuminate\Support\Facades\Cache::flush();
echo "Cache cleared.\n";
