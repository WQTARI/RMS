<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class OrderPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        // Admin doesn't have access to Analysis page specifically
        if ($ability === 'view_limited_archive') {
            return null;
        }

        if ($user->hasPermission('manage_settings')) {
            return true;
        }
        return null;
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('view_only') ||
            $user->hasPermission('view_limited_archive') ||
            $user->hasPermission('update_item_status');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Order $order): bool
    {
        return $user->hasPermission('view_only') || $user->hasPermission('update_item_status');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('create_order') || $user->hasPermission('manage_reservations');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Order $order): bool
    {
        if ($order->invoice?->status === \App\Enums\InvoiceStatus::Paid) {
            return false;
        }
        return $user->hasPermission('modify_order_content');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Order $order): bool
    {
        if ($order->invoice?->status === \App\Enums\InvoiceStatus::Paid) {
            return false;
        }
        return $user->hasPermission('modify_order_content');
    }

    /**
     * Determine whether the user can confirm the order.
     */
    public function confirm(User $user, Order $order): bool
    {
        return $user->hasPermission('create_order') || $user->hasPermission('manage_reservations');
    }

    /**
     * Determine whether the user can update the status of a specific item.
     * Enforces Kitchen/Dessert station boundaries.
     */
    public function updateItemStatus(User $user, OrderItem $orderItem): bool
    {
        if (!$user->hasPermission('update_item_status')) {
            return false;
        }

        // If user is assigned to a specific prep section, they can only update items for that section
        if ($user->prep_section_id && $orderItem->prep_section_id !== $user->prep_section_id) {
            return false;
        }

        return true;
    }
}
