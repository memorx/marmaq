import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Configuración base compatible con Edge Runtime (sin acceso a DB)
// El Credentials provider se añade en auth.ts para rutas de API
export const authConfig: NextAuthConfig = {
  providers: [], // Se añaden en auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = nextUrl.pathname === "/login";
      const isOnApiAuth = nextUrl.pathname.startsWith("/api/auth");

      // Permitir rutas de autenticación
      if (isOnApiAuth) {
        return true;
      }

      // Redirigir a dashboard si ya está logueado e intenta ir a login
      if (isLoggedIn && isOnLoginPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Redirigir a login si no está logueado
      if (!isLoggedIn && !isOnLoginPage) {
        return false; // Redirige automáticamente a signIn page
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
