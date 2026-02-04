import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "build/**"],
  },
  // Prevenir imports de @prisma/client en código client-side
  // Bug original: La campanita de notificaciones crasheaba silenciosamente
  // porque componentes "use client" importaban enums de @prisma/client
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", {
        patterns: [{
          group: ["@prisma/client"],
          allowTypeImports: true,
          message: "No importar valores de @prisma/client en componentes client-side. Usa tipos de @/types/. Los type imports están permitidos."
        }]
      }]
    }
  },
];

export default eslintConfig;
