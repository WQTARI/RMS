<?php
$drinkSection = \App\Models\PrepSection::where('name', 'Drinks')->first();
if (!$drinkSection) {
    echo "Drinks Section NOT FOUND\n";
    $all = \App\Models\PrepSection::all();
    foreach($all as $s) { echo $s->id . ": " . $s->name . "\n"; }
} else {
    echo "Drinks Section ID: " . $drinkSection->id . "\n";
    $items = \App\Models\OrderItem::where('prep_section_id', $drinkSection->id)->count();
    echo "Total OrderItems in Drinks: " . $items . "\n";
    
    $paidItems = \App\Models\OrderItem::where('prep_section_id', $drinkSection->id)
        ->whereHas('order.invoice', function($q) {
            $q->where('status', \App\Enums\InvoiceStatus::Paid);
        })->count();
    echo "Paid OrderItems in Drinks: " . $paidItems . "\n";

    // Check if any Drink menu items exist but have wrong prep_section_id
    $drinkMenuItems = \App\Models\MenuItem::where('category', 'DRINK')->get();
    echo "Total Drink MenuItems: " . $drinkMenuItems->count() . "\n";
    foreach($drinkMenuItems as $item) {
        if ($item->prep_section_id != $drinkSection->id) {
            echo "MISMATCH: Item {$item->name} has section {$item->prep_section_id} but Drinks is {$drinkSection->id}\n";
        }
    }
}
