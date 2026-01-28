<?php

namespace App\Enums;

enum InvoiceStatus: string
{
    case Open = 'OPEN';
    case Paid = 'PAID';
    case Cancelled = 'CANCELLED';
}
