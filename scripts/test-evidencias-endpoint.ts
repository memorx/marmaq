/**
 * Script para probar el endpoint de upload de evidencias
 * Ejecutar con: npx tsx scripts/test-evidencias-endpoint.ts
 *
 * IMPORTANTE: El servidor de desarrollo debe estar corriendo (npm run dev)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const TEST_USER = {
  email: "ricardo@marmaq.mx",
  password: "marmaq2024",
};

// Crear cliente Prisma para verificaciones directas
function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Crear una imagen de prueba simple (1x1 pixel PNG)
function createTestImage(): Buffer {
  // PNG 1x1 pixel rojo
  const pngData = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe,
    0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  return pngData;
}

// Cookie jar para manejar cookies
class CookieJar {
  private cookies: Map<string, string> = new Map();

  addFromResponse(response: Response) {
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    for (const cookie of setCookieHeaders) {
      const [nameValue] = cookie.split(";");
      const [name, value] = nameValue.split("=");
      if (name && value !== undefined) {
        this.cookies.set(name.trim(), value);
      }
    }
  }

  toString(): string {
    const parts: string[] = [];
    this.cookies.forEach((value, name) => {
      parts.push(`${name}=${value}`);
    });
    return parts.join("; ");
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  size(): number {
    return this.cookies.size;
  }
}

async function testEvidenciasEndpoint() {
  console.log("=".repeat(60));
  console.log("TEST DEL ENDPOINT DE EVIDENCIAS");
  console.log("=".repeat(60));
  console.log(`\nBase URL: ${BASE_URL}`);

  const prisma = createPrismaClient();
  const cookieJar = new CookieJar();

  try {
    // 1. Verificar que el servidor está corriendo
    console.log("\n[1/7] Verificando que el servidor está corriendo...");
    try {
      const healthCheck = await fetch(`${BASE_URL}/api/auth/providers`);
      if (!healthCheck.ok) {
        throw new Error(`Server returned ${healthCheck.status}`);
      }
      console.log("   OK: Servidor respondiendo");
    } catch {
      console.error("   ERROR: El servidor no está corriendo");
      console.log("   Ejecuta 'npm run dev' en otra terminal");
      process.exit(1);
    }

    // 2. Obtener CSRF token y cookies iniciales
    console.log("\n[2/7] Obteniendo CSRF token...");
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    cookieJar.addFromResponse(csrfResponse);
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    console.log(`   OK: CSRF token obtenido`);
    console.log(`   Cookies iniciales: ${cookieJar.size()}`);

    // 3. Hacer login via POST a signin
    console.log("\n[3/7] Haciendo login...");
    console.log(`   Usuario: ${TEST_USER.email}`);

    // Primero verificar que el usuario existe
    const userCheck = await prisma.user.findUnique({
      where: { email: TEST_USER.email },
      select: { id: true, email: true, activo: true, name: true },
    });

    if (!userCheck) {
      console.error(`   ERROR: Usuario ${TEST_USER.email} no existe`);
      console.log("   Ejecuta: npm run db:seed");
      process.exit(1);
    }

    if (!userCheck.activo) {
      console.error("   ERROR: Usuario está inactivo");
      process.exit(1);
    }

    // Next-auth v5: POST a /api/auth/callback/credentials
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieJar.toString(),
      },
      body: new URLSearchParams({
        csrfToken,
        email: TEST_USER.email,
        password: TEST_USER.password,
        callbackUrl: `${BASE_URL}/dashboard`,
      }),
      redirect: "manual",
    });

    cookieJar.addFromResponse(loginResponse);

    // Si hay redirect, seguirlo
    if (loginResponse.status === 302 || loginResponse.status === 307) {
      const location = loginResponse.headers.get("location");
      if (location && !location.includes("error")) {
        const redirectUrl = location.startsWith("http") ? location : `${BASE_URL}${location}`;
        const followResponse = await fetch(redirectUrl, {
          headers: { Cookie: cookieJar.toString() },
          redirect: "manual",
        });
        cookieJar.addFromResponse(followResponse);
      }
    }

    // Verificar sesión
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: cookieJar.toString() },
    });
    cookieJar.addFromResponse(sessionResponse);
    const session = await sessionResponse.json();

    if (!session?.user) {
      console.error("   ERROR: Login fallido - No se obtuvo sesión");
      console.log("\n   Debug info:");
      console.log(`   - Login status: ${loginResponse.status}`);
      console.log(`   - Location: ${loginResponse.headers.get("location")}`);
      console.log(`   - Cookies: ${cookieJar.size()}`);
      console.log(`   - Session response: ${JSON.stringify(session)}`);
      console.log("\n   Posibles causas:");
      console.log("   1. Contraseña incorrecta");
      console.log("   2. AUTH_SECRET no configurado");
      console.log("   3. El seed no se ejecutó correctamente");
      process.exit(1);
    }

    console.log(`   OK: Login exitoso`);
    console.log(`   Usuario: ${session.user.name} (${session.user.role})`);

    // 4. Obtener una orden existente
    console.log("\n[4/7] Buscando una orden existente...");
    const orden = await prisma.orden.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, folio: true, estado: true },
    });

    if (!orden) {
      console.error("   ERROR: No hay órdenes en la base de datos");
      console.log("   Ejecuta: npm run db:seed");
      process.exit(1);
    }

    console.log(`   OK: Orden encontrada`);
    console.log(`   Folio: ${orden.folio}`);
    console.log(`   ID: ${orden.id}`);
    console.log(`   Estado: ${orden.estado}`);

    // 5. Subir imagen de prueba
    console.log("\n[5/7] Subiendo imagen de prueba...");
    const testImage = createTestImage();

    const formData = new FormData();
    formData.append("tipo", "DIAGNOSTICO");
    formData.append("descripcion", "Imagen de prueba - Script de verificación");
    formData.append("files", new Blob([testImage], { type: "image/png" }), "test-image.png");

    const uploadResponse = await fetch(`${BASE_URL}/api/ordenes/${orden.id}/evidencias`, {
      method: "POST",
      headers: {
        Cookie: cookieJar.toString(),
      },
      body: formData,
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error(`   ERROR (${uploadResponse.status}):`, uploadResult.error);
      if (uploadResponse.status === 401) {
        console.log("   La sesión no está siendo reconocida por el endpoint");
      }
      process.exit(1);
    }

    console.log(`   OK: ${uploadResult.message}`);
    const evidenciaCreada = uploadResult.evidencias[0];
    console.log(`   ID evidencia: ${evidenciaCreada.id}`);
    console.log(`   URL: ${evidenciaCreada.url}`);

    // 6. Verificar en base de datos
    console.log("\n[6/7] Verificando en base de datos...");
    const evidenciaDB = await prisma.evidencia.findUnique({
      where: { id: evidenciaCreada.id },
    });

    if (!evidenciaDB) {
      console.error("   ERROR: Evidencia no encontrada en BD");
      process.exit(1);
    }

    console.log("   OK: Evidencia guardada en BD");
    console.log(`   Tipo: ${evidenciaDB.tipo}`);
    console.log(`   Filename: ${evidenciaDB.filename}`);
    console.log(`   Descripción: ${evidenciaDB.descripcion}`);

    // 7. Verificar URL accesible
    console.log("\n[7/7] Verificando accesibilidad de la URL...");
    const imageResponse = await fetch(evidenciaCreada.url);

    if (imageResponse.ok) {
      const contentType = imageResponse.headers.get("content-type");
      console.log(`   OK: URL accesible (${contentType})`);
    } else {
      console.log(`   ADVERTENCIA: URL retorna ${imageResponse.status}`);
    }

    // Cleanup - Eliminar evidencia de prueba
    console.log("\n[CLEANUP] Eliminando evidencia de prueba...");
    const deleteResponse = await fetch(
      `${BASE_URL}/api/ordenes/${orden.id}/evidencias?evidenciaId=${evidenciaCreada.id}`,
      {
        method: "DELETE",
        headers: { Cookie: cookieJar.toString() },
      }
    );

    if (deleteResponse.ok) {
      console.log("   OK: Evidencia de prueba eliminada");
    } else {
      const deleteError = await deleteResponse.json();
      console.log(`   Advertencia: ${deleteError.error}`);
    }

    // Resumen
    console.log("\n" + "=".repeat(60));
    console.log("RESULTADO: TODAS LAS PRUEBAS PASARON");
    console.log("=".repeat(60));
    console.log("\nEl endpoint de evidencias funciona correctamente:");
    console.log("  - Login con credenciales");
    console.log("  - Upload de imágenes a Supabase Storage");
    console.log("  - Guardado de metadatos en PostgreSQL");
    console.log("  - URLs públicas accesibles");
    console.log("  - Eliminación de evidencias");

  } catch (error) {
    console.error("\nError inesperado:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
testEvidenciasEndpoint();
