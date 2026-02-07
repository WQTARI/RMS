<?php

namespace App\Enums;

enum TableStatus: string
{
    case Available = 'AVAILABLE';
    case Browsing = 'BROWSING';
    case Occupied = 'OCCUPIED';
}
