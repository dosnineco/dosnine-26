import { authMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const rateLimitMap = new Map();

function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

function applyApiSecurity(request, response) {
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/api/')) {
    return response;
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const method = request.method.toUpperCase();
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(method)) {
    return new NextResponse(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      },
    });
  }

  const query = url.searchParams;
  const suspiciousLength = [...query.keys()].reduce((total, key) => {
    const value = query.get(key) || '';
    return total + key.length + value.length;
  }, 0);

  if (suspiciousLength > 2000) {
    return new NextResponse(JSON.stringify({ error: 'Request too large' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = Date.now();
  const ip = getClientIp(request);
  const key = `api_rate:${ip}`;
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
    return response;
  }

  if (entry.count >= 120) {
    const retryAfter = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1);
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    });
  }

  entry.count += 1;
  rateLimitMap.set(key, entry);

  return response;
}

const authMiddlewareHandler = authMiddleware({
  publicRoutes: () => true,
});

export default async function middleware(request) {
  const response = await authMiddlewareHandler(request);
  if (!response) {
    return response;
  }

  return applyApiSecurity(request, response);
}

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};