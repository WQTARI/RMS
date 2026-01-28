<?php

namespace App\Enums;

enum ReservationStatus: string
{
    case Created = 'CREATED';
    case Arrived = 'ARRIVED';
    case Seated = 'SEATED';
    case Cancelled = 'CANCELLED';
    case Completed = 'COMPLETED';
}
