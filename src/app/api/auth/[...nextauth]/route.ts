import { handlers } from "@/lib/auth/auth";
import { loginRateLimiter } from "@/lib/utils/rate-limiter";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET handler for NextAuth (session, csrf, etc.)
export const { GET } = handlers;

// POST handler with rate limiting for login protection
export async function POST(request: NextRequest) {
  // Get IP from request headers
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const { allowed, remaining, resetAt } = loginRateLimiter.check(ip);

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: "Demasiados intentos de login. Intente de nuevo más tarde.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": resetAt.toISOString(),
        },
      }
    );
  }

  // Pass to NextAuth handler
  return handlers.POST(request);
}
