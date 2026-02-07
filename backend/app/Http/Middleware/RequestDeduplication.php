<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class RequestDeduplication
{
    /**
     * Handle an incoming request with deduplication support.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only apply to mutation requests
        if (!in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            return $next($request);
        }

        $idempotencyKey = $request->header('X-Idempotency-Key');

        if (!$idempotencyKey) {
            return $next($request);
        }

        // Check if we've seen this request before
        $cacheKey = "idempotency:{$idempotencyKey}";
        $cached = Cache::get($cacheKey);

        if ($cached) {
            // Return cached response
            return response()->json($cached['data'], $cached['status'])
                ->header('X-Idempotent-Replay', 'true');
        }

        // Process request
        $response = $next($request);

        // Cache successful responses for 24 hours
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            Cache::put($cacheKey, [
                'data' => json_decode($response->getContent(), true),
                'status' => $response->getStatusCode(),
            ], now()->addHours(24));
        }

        return $response;
    }
}
