<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Latest 5 Orders ===\n";
$orders = App\Models\Order::latest()->take(5)->get();
foreach ($orders as $order) {
    echo sprintf(
        "ID: %d | Table: %s | Invoice: %s | Status: %s | Created: %s\n",
        $order->id,
        $order->table_id ?? 'NULL',
        $order->invoice_id ?? 'NULL',
        $order->status,
        $order->created_at
    );
}

echo "\n=== Latest 3 Invoices ===\n";
$invoices = App\Models\Invoice::latest()->take(3)->get();
foreach ($invoices as $inv) {
    echo sprintf(
        "ID: %d | Table: %s | Status: %s | Total: %.2f\n",
        $inv->id,
        $inv->restaurant_table_id ?? 'NULL',
        $inv->status,
        $inv->total
    );
}
