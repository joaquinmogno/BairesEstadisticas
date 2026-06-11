import { NextRequest, NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE } from "./lib/admin-auth";

export function middleware(request: NextRequest) {
  const token = request.cookies.get(ADMIN_AUTH_COOKIE)?.value;
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  if (!token && !isLogin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (token && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
