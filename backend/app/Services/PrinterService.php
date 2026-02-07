<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\PrepSection;
use Illuminate\Support\Collection;

class PrinterService
{
    /**
     * Generate tickets for a specific Order (e.g. Kitchen Order Ticket).
     */
    public function printOrder(Order $order): array
    {
        // Eager load items if not loaded
        $order->load(['items.menuItem', 'items.prepSection']);

        return $this->groupItemsToTickets($order->items);
    }

    /**
     * Splits an invoice into separate tickets based on preparation sections.
     */
    public function generateTickets(Invoice $invoice): array
    {
        $allOrderItems = $invoice->orders()
            ->with(['items.menuItem', 'items.prepSection'])
            ->get()
            ->flatMap(fn($order) => $order->items);

        return $this->groupItemsToTickets($allOrderItems);
    }

    /**
     * Helper to group items by section and format as tickets.
     */
    protected function groupItemsToTickets($items): array
    {
        $tickets = [];

        // Group items by their preparation section
        $groupedItems = $items->groupBy('prep_section_id');

        foreach ($groupedItems as $sectionId => $sectionItems) {
            $section = PrepSection::find($sectionId);

            // If no section is found, we can group them as "General" or log a warning
            $sectionName = $section ? $section->name : 'General';
            $printerConfig = $section ? [
                'ip' => $section->printer_ip,
                'port' => $section->printer_port,
                'name' => $section->printer_name,
            ] : null;

            $tickets[] = [
                'section_id' => $sectionId,
                'section_name' => $sectionName,
                'printer' => $printerConfig,
                'items' => $sectionItems->map(fn($item) => [
                    'id' => $item->id,
                    'name' => $item->menuItem->name,
                    'quantity' => $item->quantity,
                    'notes' => $item->notes,
                    'status' => $item->status,
                ])->toArray(),
            ];
        }

        return $tickets;
    }
    /**
     * Send a raw string to a network printer.
     */
    public function sendToPrinter(string $ip, int $port, string $content): bool
    {
        try {
            $fp = fsockopen($ip, $port, $errno, $errstr, 2); // 2 seconds timeout
            if (!$fp) {
                \Log::error("Printer connection failed: $errstr ($errno)");
                return false;
            }

            fwrite($fp, $content);
            fclose($fp);
            return true;
        } catch (\Exception $e) {
            \Log::error("Printer exception: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Format a ticket array into ESC/POS commands.
     * This is a basic implementation. real-world usage might need a library like mike42/escpos-php
     */
    public function formatTicket(array $ticket): string
    {
        $ESC = "\x1b";
        $GS = "\x1d";
        $NUL = "\x00";

        $data = $ESC . "@"; // Initialize printer

        // Center Alignment
        $data .= $ESC . "a" . "\x01";

        // Title (Double Height + Width)
        $data .= $ESC . "!" . "\x30";
        $data .= "TICKET: " . ($ticket['section_name'] ?? 'KITCHEN') . "\n";
        $data .= $ESC . "!" . "\x00"; // Reset sizing

        $data .= "--------------------------------\n";
        $data .= "Date: " . date('Y-m-d H:i') . "\n";
        $data .= "--------------------------------\n\n";

        // Left Alignment for items
        $data .= $ESC . "a" . "\x00";

        foreach ($ticket['items'] as $item) {
            $qty = str_pad($item['quantity'] . "x", 4);
            $name = substr($item['name'], 0, 28); // Truncate if too long

            // Bold Item Name
            $data .= $ESC . "E" . "\x01" . $qty . $name . $ESC . "E" . "\x00" . "\n";

            if (!empty($item['notes'])) {
                $data .= "   Note: " . $item['notes'] . "\n";
            }
            $data .= "\n";
        }

        $data .= "--------------------------------\n";

        // Cut Paper
        $data .= $GS . "V" . "\x41" . "\x03";

        return $data;
    }

    /**
     * Print all tickets for an invoice to their respective section printers.
     */
    public function printInvoiceTickets(Invoice $invoice)
    {
        $tickets = $this->generateTickets($invoice);
        $results = [];

        foreach ($tickets as $ticket) {
            if (isset($ticket['printer']['ip']) && isset($ticket['printer']['port'])) {
                $content = $this->formatTicket($ticket);
                $status = $this->sendToPrinter($ticket['printer']['ip'], $ticket['printer']['port'], $content);
                $results[] = [
                    'section' => $ticket['section_name'],
                    'status' => $status ? 'success' : 'failed',
                    'ip' => $ticket['printer']['ip']
                ];
            } else {
                $results[] = [
                    'section' => $ticket['section_name'],
                    'status' => 'skipped (no printer config)'
                ];
            }
        }

        return $results;
    }
}
