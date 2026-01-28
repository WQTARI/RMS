<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Open = 'OPEN';
    case InProgress = 'IN_PROGRESS';
    case Ready = 'READY';
    case Closed = 'CLOSED';
    case Cancelled = 'CANCELLED';
}
