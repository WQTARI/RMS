<?php

namespace App\Enums;

enum OrderItemStatus: string
{
    case Draft = 'DRAFT';
    case Pending = 'PENDING';
    case InProgress = 'IN_PROGRESS';
    case Ready = 'READY';
    case Served = 'SERVED';
    case Cancelled = 'CANCELLED';
}
