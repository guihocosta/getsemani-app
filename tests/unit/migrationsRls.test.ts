import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// A anon key e publica e o PostgREST expoe o schema public: tabela criada sem
// RLS fica legivel e gravavel por qualquer pessoa em /rest/v1. Toda migration
// que cria tabela precisa liga-la (ver 20261016220000_enable_rls).
describe("migrations: toda tabela tem RLS", () => {
  it("cada CREATE TABLE tem ENABLE ROW LEVEL SECURITY em alguma migration", () => {
    const dir = join(process.cwd(), "prisma", "migrations");
    const sql = readdirSync(dir)
      .map((d) => join(dir, d, "migration.sql"))
      .filter(existsSync)
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");

    const created = [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((m) => m[1]);
    const protegidas = new Set(
      [...sql.matchAll(/ALTER TABLE (?:IF EXISTS )?"([^"]+)" ENABLE ROW LEVEL SECURITY/g)].map((m) => m[1]),
    );

    expect(created.length).toBeGreaterThan(0);
    expect(created.filter((t) => !protegidas.has(t))).toEqual([]);
  });
});
