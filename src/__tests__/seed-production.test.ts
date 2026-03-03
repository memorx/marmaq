import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Tests para validar el seed de producción.
 * Lee el archivo seed-production.ts y verifica que contiene los datos esperados.
 */

const seedPath = resolve(__dirname, "../../prisma/seed-production.ts");
const seedContent = readFileSync(seedPath, "utf-8");

// Extraer todos los emails del seed
function extractEmails(content: string): string[] {
  const emailRegex = /email:\s*"([^"]+)"/g;
  const emails: string[] = [];
  let match;
  while ((match = emailRegex.exec(content)) !== null) {
    emails.push(match[1]);
  }
  return emails;
}

// Parse the USUARIOS array entries
function extractUsuarioBlocks(content: string): Array<{ email: string; role: string; name: string }> {
  const blockRegex = /\{\s*email:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*role:\s*Role\.(\w+)/g;
  const usuarios: Array<{ email: string; role: string; name: string }> = [];
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    usuarios.push({ email: match[1], name: match[2], role: match[3] });
  }
  return usuarios;
}

const allEmails = extractEmails(seedContent);
const allUsuarios = extractUsuarioBlocks(seedContent);
const tecnicos = allUsuarios.filter((u) => u.role === "TECNICO");

describe("seed-production.ts — Técnicos", () => {
  const EXPECTED_TECNICOS = [
    "jesus.rosales@marmaq.mx",
    "poli@marmaq.mx",
    "exmex@marmaq.mx",
    "isaias@marmaq.mx",
  ];

  it("contiene los 4 técnicos del seed (los demás ya existen con otros emails)", () => {
    expect(tecnicos).toHaveLength(4);
  });

  it.each(EXPECTED_TECNICOS)("contiene al técnico %s", (email) => {
    const found = tecnicos.find((t) => t.email === email);
    expect(found).toBeDefined();
    expect(found?.role).toBe("TECNICO");
  });

  it("no tiene emails duplicados en el array USUARIOS", () => {
    const uniqueEmails = new Set(allEmails);
    expect(uniqueEmails.size).toBe(allEmails.length);
  });

  it("todos los técnicos del seed usan password noLogin2024", () => {
    for (const email of EXPECTED_TECNICOS) {
      const entryRegex = new RegExp(
        `email:\\s*"${email.replace(/\./g, "\\.")}"[^}]*password:\\s*"noLogin2024"`,
      );
      expect(seedContent).toMatch(entryRegex);
    }
  });

  it("no contiene técnicos de demo eliminados (benito, carlos)", () => {
    expect(seedContent).not.toContain("benito@marmaq.mx");
    expect(seedContent).not.toContain("carlos@marmaq.mx");
  });
});

describe("seed-production.ts — Estructura general", () => {
  it("contiene todos los roles esperados", () => {
    const roles = new Set(allUsuarios.map((u) => u.role));
    expect(roles).toContain("SUPER_ADMIN");
    expect(roles).toContain("COORD_SERVICIO");
    expect(roles).toContain("REFACCIONES");
    expect(roles).toContain("TECNICO");
    expect(roles).toContain("VENDEDOR");
  });

  it("usa upsert para ser idempotente", () => {
    expect(seedContent).toContain("prisma.user.upsert");
  });
});

describe("GET /api/usuarios?role=TECNICO — cobertura", () => {
  // This test validates that the API endpoint logic correctly filters by role
  // by checking the route source code handles the role parameter
  it("la API filtra por role usando where.role = { in: roles }", () => {
    const routePath = resolve(__dirname, "../app/api/usuarios/route.ts");
    const routeContent = readFileSync(routePath, "utf-8");

    // Verify the route splits role param and filters
    expect(routeContent).toContain('role.split(",")');
    expect(routeContent).toContain("where.role = { in: roles }");
  });

  it("la API retorna formato { usuarios: [...] } compatible con los dropdowns", () => {
    const routePath = resolve(__dirname, "../app/api/usuarios/route.ts");
    const routeContent = readFileSync(routePath, "utf-8");

    // Verify the response wraps in { usuarios, pagination }
    expect(routeContent).toMatch(/NextResponse\.json\(\s*\{\s*usuarios/);
  });
});
