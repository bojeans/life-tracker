import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo-cookie";
import { rateLimit } from "@/lib/rate-limit";

export const proxy = auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!(req as { auth: unknown }).auth;
  // Demo visitors carry the demo cookie; server actions/reads still verify the
  // account is `isDemo`, so this only gates the sign-in redirect (UX), not data.
  const hasDemoCookie = !!req.cookies.get(DEMO_COOKIE)?.value;

  // Basic abuse protection: throttle demo-account traffic (the only public write
  // surface) per IP. Generous enough for a person browsing; blocks scripted
  // spam. Owner/normal traffic is unaffected.
  if (hasDemoCookie) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!rateLimit(`demo:${ip}`, 240, 60_000)) {
      return new NextResponse("Too many requests — please slow down.", {
        status: 429,
      });
    }
  }

  const isPublicPath =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/shared") ||
    pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isPublicPath && !hasDemoCookie) {
    const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
