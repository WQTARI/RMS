<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;

class InvoicePolicy
{
    /**
     * Perform pre-authorization checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasPermission('manage_settings')) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasPermission('create_order') || $user->hasPermission('close_invoice');
    }

    public function view(User $user, Invoice $invoice): bool
    {
        return $user->hasPermission('create_order') || $user->hasPermission('close_invoice');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('create_order');
    }

    public function update(User $user, Invoice $invoice): bool
    {
        if ($invoice->status === \App\Enums\InvoiceStatus::Paid) {
            return false;
        }
        return $user->hasPermission('close_invoice');
    }

    public function delete(User $user, Invoice $invoice): bool
    {
        return $user->hasPermission('manage_settings');
    }
}
