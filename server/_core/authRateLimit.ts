import { TRPCError } from "@trpc/server";
import type { Request } from "express";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function enforceAuthRateLimit(
  req: Request,
  action: string,
  limit = 5,
  windowMs = 15 * 60_000
) {
  const now = Date.now();
  const address = req.ip || req.socket.remoteAddress || "unknown";
  const key = `${action}:${address}`;
  const current = buckets.get(key);
  const bucket =
    !current || current.resetAt <= now
      ? { count: 1, resetAt: now + windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };
  buckets.set(key, bucket);

  if (buckets.size > 10_000) {
    buckets.forEach((value, bucketKey) => {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    });
  }

  if (bucket.count > limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please try again later.",
    });
  }
}
