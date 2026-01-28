<?php

namespace Tests;

use Illuminate\Support\Facades\Event;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['broadcasting.default' => 'null']);
        Event::fakeExcept(['eloquent.*']);
    }
}
