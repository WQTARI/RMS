<?php

namespace App\Policies;

use App\Models\OrderItem;
use App\Models\User;

class OrderItemPolicy
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

    /**
     * Determine whether the user can serve (mark as served) a specific item.
     */
    public function serve(User $user, OrderItem $orderItem): bool
    {
        return $user->hasPermission('serve_items') && $orderItem->status === \App\Enums\OrderItemStatus::Ready;
    }
}
