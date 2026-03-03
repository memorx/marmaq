import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const USUARIOS = [
  {
    email: "admin@marmaq.mx",
    name: "Guillermo Jaramillo",
    role: Role.SUPER_ADMIN,
  },
  {
    email: "ricardo@marmaq.mx",
    name: "Ricardo Castillo",
    role: Role.COORD_SERVICIO,
  },
  {
    email: "magali@marmaq.mx",
    name: "Magali González",
    role: Role.COORD_SERVICIO,
  },
  {
    email: "roberto@marmaq.mx",
    name: "Roberto Hernández",
    role: Role.REFACCIONES,
  },
  {
    email: "benito@marmaq.mx",
    name: "Benito García",
    role: Role.TECNICO,
  },
  {
    email: "carlos@marmaq.mx",
    name: "Carlos Mendoza",
    role: Role.TECNICO,
  },
  {
    email: "jesus.rosales@marmaq.mx",
    name: "Jesus Rosales",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "martin.gonzalez@marmaq.mx",
    name: "Martín González",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "leo.sanchez@marmaq.mx",
    name: "Leo Sánchez",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "jacobo.calvillo@marmaq.mx",
    name: "Jacobo Calvillo",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "jesus.olivo@marmaq.mx",
    name: "Jesus Olivo",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "francisco.saldana@marmaq.mx",
    name: "Francisco Saldaña",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "victor.solis@marmaq.mx",
    name: "Víctor Solís",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "poli@marmaq.mx",
    name: "Poli",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "exmex@marmaq.mx",
    name: "Exmex",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "antonio.perez@marmaq.mx",
    name: "Antonio Pérez",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "isaias@marmaq.mx",
    name: "Isaías",
    role: Role.TECNICO,
    password: "noLogin2024",
  },
  {
    email: "vendedor@marmaq.mx",
    name: "Vendedor Demo",
    role: Role.VENDEDOR,
  },
];

async function main() {
  console.log("🌱 Seed de producción — solo usuarios (upsert)...\n");

  const defaultHashedPassword = await bcrypt.hash("marmaq2024", 10);
  const noLoginHashedPassword = await bcrypt.hash("noLogin2024", 10);

  for (const u of USUARIOS) {
    const password = u.password === "noLogin2024" ? noLoginHashedPassword : defaultHashedPassword;
    const result = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        activo: true,
      },
      create: {
        email: u.email,
        name: u.name,
        password,
        role: u.role,
        activo: true,
      },
    });

    console.log(`  ✓ ${result.name} (${result.email}) — ${result.role}`);
  }

  console.log(`\n✅ ${USUARIOS.length} usuarios sincronizados.`);
  console.log("\n⚠️  Contraseña temporal: marmaq2024 (solo aplica a usuarios nuevos)");
  console.log("   El upsert NO sobrescribe la contraseña de usuarios existentes.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed de producción:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
