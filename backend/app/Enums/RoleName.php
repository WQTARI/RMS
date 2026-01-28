<?php

namespace App\Enums;

enum RoleName: string
{
    case Admin = 'Admin';
    case Cashier = 'Cashier';
    case Receptionist = 'Receptionist';
    case Kitchen = 'Kitchen';
    case Desserts = 'Desserts';
    case Drinks = 'Drinks';
    case Reception = 'Reception';

    public static function confirmable(): array
    {
        return [
            self::Admin->value,
            self::Cashier->value,
            self::Receptionist->value,
        ];
    }
}
