<?php

namespace App\Exceptions;

use Exception;

class ConcurrentModificationException extends Exception
{
    public function __construct(string $model, int $id, int $expectedVersion, int $actualVersion)
    {
        parent::__construct(
            "Concurrent modification detected for {$model} #{$id}. Expected version {$expectedVersion}, found {$actualVersion}."
        );
    }
}
