<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;

Route::get('/{any}', function () {
    $path = public_path('index.html');
    if (!File::exists($path)) {
        return view('welcome');
    }
    return File::get($path);
})->where('any', '^(?!api|storage).*$');

Route::get('/', function () {
    $path = public_path('index.html');
    if (!File::exists($path)) {
        return view('welcome');
    }
    return File::get($path);
});
