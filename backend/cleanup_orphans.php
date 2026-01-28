<?php
use App\Models\PrepSection;
use App\Models\TableSection;
use App\Models\MenuItem;
use App\Models\RestaurantTable;

echo "Cleaning up PrepSections...\n";
foreach(PrepSection::onlyTrashed()->get() as $section) {
    echo "- Section: {$section->name} (ID: {$section->id})\n";
    $count = $section->menuItems()->count();
    $section->menuItems()->delete();
    echo "  Soft-deleted {$count} menu items.\n";
}

echo "\nCleaning up TableSections...\n";
foreach(TableSection::onlyTrashed()->get() as $section) {
    echo "- Section: {$section->name} (ID: {$section->id})\n";
    $count = $section->tables()->count();
    $section->tables()->delete();
    echo "  Soft-deleted {$count} tables.\n";
}

echo "\nDone.\n";
