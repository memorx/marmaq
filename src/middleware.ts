import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname === "/login";
  const isOnApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const isPublicAsset = req.nextUrl.pathname.startsWith("/_next") ||
                        req.nextUrl.pathname.includes(".");

  // Permitir rutas públicas
  if (isOnApiAuth || isPublicAsset) {
    return NextResponse.next();
  }

  // Redirigir a dashboard si ya está logueado e intenta ir a login
  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirigir a login si no está logueado
  if (!isLoggedIn && !isOnLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
