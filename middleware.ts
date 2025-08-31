import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("auth-token")?.value;

  if (token && req.nextUrl.pathname === "/") {
    // If signed in and trying to access landing page
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!token && req.nextUrl.pathname.startsWith("/dashboard")) {
    // If not signed in and trying to access dashboard
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"], // protect routes
};
