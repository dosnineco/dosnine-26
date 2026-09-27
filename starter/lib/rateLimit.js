/* ----------------------------------------------------------
 * Rate limiter with Upstash Redis fallback.
 *
 * - If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are
 *   set, uses a distributed sliding-window limiter so the limit
 *   is enforced across every serverless instance.
 * - Otherwise falls back to a per-instance in-memory limiter,
 *   which still stops naive single-client abuse.
 *
 * The limiter does NOT send the response itself — callers get a
 * plain result object and decide how to respond.
 * ---------------------------------------------------------- */

const buckets = new Map();
const upstashLimiterCache = new Map();

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  return req.socket?.remoteAddress || 'unknown';
}

function cleanupExpired(now) {
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(key);
  }
}

/* ----------------------------------------------------------
 * In-memory fallback
 * ---------------------------------------------------------- */
export function enforceRateLimit(req, res, { keyPrefix, maxRequests, windowMs }) {
  const now = Date.now();
  cleanupExpired(now);

  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(maxRequests - 1, 0)));
    return { allowed: true };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(Math.ceil((existing.resetAt - now) / 1000), 1);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', '0');
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  buckets.set(key, existing);
  res.setHeader('X-RateLimit-Limit', String(maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(maxRequests - existing.count, 0)));
  return { allowed: true };
}

/* ----------------------------------------------------------
 * Upstash-backed limiter (opt-in)
 * ---------------------------------------------------------- */
function hasUpstashConfig() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

async function getUpstashLimiter(maxRequests, windowMs) {
  if (!hasUpstashConfig()) return null;

  const cacheKey = `${maxRequests}:${windowMs}`;
  if (upstashLimiterCache.has(cacheKey)) {
    return upstashLimiterCache.get(cacheKey);
  }

  const [{ Redis }, { Ratelimit }] = await Promise.all([
    import('@upstash/redis'),
    import('@upstash/ratelimit'),
  ]);

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      maxRequests,
      `${Math.ceil(windowMs / 1000)} s`
    ),
    analytics: true,
    prefix: 'dosnine:api:ratelimit',
  });

  upstashLimiterCache.set(cacheKey, limiter);
  return limiter;
}

/**
 * Prefer the distributed limiter when Upstash is configured,
 * otherwise fall back to the in-memory one. Same return shape
 * either way.
 */
export async function enforceRateLimitDistributed(
  req,
  res,
  { keyPrefix, maxRequests, windowMs, identifier }
) {
  try {
    const limiter = await getUpstashLimiter(maxRequests, windowMs);

    if (!limiter) {
      return enforceRateLimit(req, res, { keyPrefix, maxRequests, windowMs });
    }

    const ip = getClientIp(req);
    const key = `${keyPrefix}:${identifier || ip}`;
    const result = await limiter.limit(key);

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(result.remaining, 0))
    );

    if (!result.success) {
      const resetSeconds = Math.max(
        Math.ceil((result.reset - Date.now()) / 1000),
        1
      );
      res.setHeader('Retry-After', String(resetSeconds));
      return { allowed: false, retryAfterSeconds: resetSeconds };
    }

    return { allowed: true };
  } catch (err) {
    console.error('Distributed rate limiter failed, using fallback:', err);
    return enforceRateLimit(req, res, { keyPrefix, maxRequests, windowMs });
  }
}

export { getClientIp };