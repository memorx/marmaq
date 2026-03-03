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
    "benito@marmaq.mx",
    "carlos@marmaq.mx",
    "jesus.rosales@marmaq.mx",
    "martin.gonzalez@marmaq.mx",
    "leo.sanchez@marmaq.mx",
    "jacobo.calvillo@marmaq.mx",
    "jesus.olivo@marmaq.mx",
    "francisco.saldana@marmaq.mx",
    "victor.solis@marmaq.mx",
    "poli@marmaq.mx",
    "exmex@marmaq.mx",
    "antonio.perez@marmaq.mx",
    "isaias@marmaq.mx",
  ];

  it("contiene los 13 técnicos (2 existentes + 11 nuevos)", () => {
    expect(tecnicos).toHaveLength(13);
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

  it("todos los nuevos técnicos usan password noLogin2024", () => {
    const newTecnicoEmails = EXPECTED_TECNICOS.filter(
      (e) => e !== "benito@marmaq.mx" && e !== "carlos@marmaq.mx"
    );

    for (const email of newTecnicoEmails) {
      // Verify the entry has password: "noLogin2024"
      const entryRegex = new RegExp(
        `email:\\s*"${email.replace(".", "\\.")}"[^}]*password:\\s*"noLogin2024"`,
      );
      expect(seedContent).toMatch(entryRegex);
    }
  });

  it("los técnicos originales NO tienen password override", () => {
    // Benito and Carlos should NOT have a password field (use default)
    const benitoBlock = seedContent.match(
      /\{\s*email:\s*"benito@marmaq\.mx"[^}]*\}/
    )?.[0];
    expect(benitoBlock).toBeDefined();
    expect(benitoBlock).not.toContain("password:");

    const carlosBlock = seedContent.match(
      /\{\s*email:\s*"carlos@marmaq\.mx"[^}]*\}/
    )?.[0];
    expect(carlosBlock).toBeDefined();
    expect(carlosBlock).not.toContain("password:");
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
