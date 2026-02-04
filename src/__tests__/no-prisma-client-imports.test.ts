import { describe, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Este test previene que componentes client-side importen valores
 * de @prisma/client, lo cual crashea silenciosamente en el navegador.
 *
 * Bug original: La campanita de notificaciones no funcionaba porque
 * NotificacionDropdown.tsx importaba enums de @prisma/client.
 */
describe("No @prisma/client value imports in client-side code", () => {
  const clientDirs = ["src/components", "src/hooks"];

  function getFilesRecursive(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getFilesRecursive(fullPath));
      } else if (entry.name.match(/\.(ts|tsx)$/)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  for (const dir of clientDirs) {
    it(`no value imports from @prisma/client in ${dir}/`, () => {
      const files = getFilesRecursive(dir);
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Match: import { X } from "@prisma/client"
          // But NOT: import type { X } from "@prisma/client"
          if (
            line.match(/from\s+["']@prisma\/client["']/) &&
            line.match(/^\s*import\s+\{/) &&
            !line.match(/^\s*import\s+type\s+\{/)
          ) {
            violations.push(`${file}:${i + 1}: ${line.trim()}`);
          }
        }
      }

      if (violations.length > 0) {
        throw new Error(
          `Found value imports from @prisma/client in client-side code!\n` +
            `These will crash silently in the browser.\n` +
            `Use types from @/types/ instead.\n\n` +
            `Violations:\n${violations.join("\n")}`
        );
      }
    });
  }
});
