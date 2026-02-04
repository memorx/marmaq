import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// Usar authConfig directamente (sin providers que acceden a DB)
// La autenticación real ocurre en las rutas de API via auth.ts
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|workbox-.*|fallback-.*|icons/.*|images/.*|screenshots/.*|.*\\.svg$|api/cron/.*).*)",
  ],
};
