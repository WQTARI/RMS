<?php

namespace App\Enums;

enum TableStatus: string
{
    case Available = 'AVAILABLE';
    case Reserved = 'RESERVED';
    case Occupied = 'OCCUPIED';
}
