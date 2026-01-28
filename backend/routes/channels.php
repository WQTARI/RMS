<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('tables', function ($user) {
    return $user?->is_active === true;
});

Broadcast::channel('orders', function ($user) {
    return $user?->is_active === true;
});

Broadcast::channel('order-items', function ($user) {
    return $user?->is_active === true;
});

Broadcast::channel('invoices', function ($user) {
    return $user?->is_active === true;
});

Broadcast::channel('reservations', function ($user) {
    return $user?->is_active === true;
});

Broadcast::channel('prep-sections.{id}', function ($user, $id) {
    return $user?->is_active === true && (int) $user->prep_section_id === (int) $id;
});
