<?php

namespace App\Exceptions;

use Exception;

class InvoiceAlreadyPaidException extends Exception
{
    public function __construct(int $invoiceId)
    {
        parent::__construct("Invoice #{$invoiceId} is already paid and cannot be modified.");
    }
}
