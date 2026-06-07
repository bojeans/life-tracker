type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Fixed-window, in-memory rate limiter. Edge-safe (no Node APIs). Returns true
// if the call is allowed, false if the limit is exceeded.
//
// In-memory means per-instance: good enough as basic abuse protection for a
// low-traffic portfolio app. If it ever needs to be distributed across
// instances, swap the Map for a shared store (e.g. Upstash Redis).
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup so the map can't grow unbounded.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
    }
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
