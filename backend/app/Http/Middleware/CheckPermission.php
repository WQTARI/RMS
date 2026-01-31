<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403, 'Forbidden');
        }

        $hasAtLeastOne = false;
        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                $hasAtLeastOne = true;
                break;
            }
        }

        if (!$hasAtLeastOne) {
            abort(403, 'Forbidden');
        }

        return $next($request);
    }
}
