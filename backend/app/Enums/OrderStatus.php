<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Draft = 'DRAFT';
    case AwaitingConfirmation = 'AWAITING_CONFIRMATION';
    case Open = 'OPEN';
    case InProgress = 'IN_PROGRESS';
    case Ready = 'READY';
    case Closed = 'CLOSED';
    case Cancelled = 'CANCELLED';
}
