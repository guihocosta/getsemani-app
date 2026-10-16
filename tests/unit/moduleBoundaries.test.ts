import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Regras da constituicao verificadas no codigo: modulos sem ciclo de import, e a
// tabela Membership so e lida por identity (o resto usa identity/services/memberships).
const MODULES_DIR = join(process.cwd(), "src", "modules");

function filesOf(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? filesOf(p) : p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
  });
}

const modules = readdirSync(MODULES_DIR).filter((m) => statSync(join(MODULES_DIR, m)).isDirectory());
const sources = Object.fromEntries(
  modules.map((m) => [m, filesOf(join(MODULES_DIR, m)).map((f) => ({ f, src: readFileSync(f, "utf8") }))]),
);

describe("fronteiras entre modulos", () => {
  it("o grafo de imports entre modulos nao tem ciclo", () => {
    const deps = new Map(
      modules.map((m) => [
        m,
        new Set(
          sources[m].flatMap(({ src }) =>
            [...src.matchAll(/@\/modules\/([a-z]+)\//g)].map((x) => x[1]).filter((d) => d !== m),
          ),
        ),
      ]),
    );

    const ciclos: string[] = [];
    const visit = (m: string, path: string[]) => {
      if (path.includes(m)) {
        ciclos.push([...path.slice(path.indexOf(m)), m].join(" -> "));
        return;
      }
      for (const d of deps.get(m) ?? []) visit(d, [...path, m]);
    };
    modules.forEach((m) => visit(m, []));

    expect(ciclos).toEqual([]);
  });

  // Excecoes aceitas (docs/validacao/2026-10-16-acoplamento.md): reports e um
  // read model so de leitura; a matriz de capacitacao precisa ordenar por nome.
  const MEMBERSHIP_PERMITIDO = new Set(["reports/services/reports.ts", "ministries/services/userSkills.ts"]);

  it("so identity consulta a tabela Membership direto", () => {
    const violacoes = modules
      .filter((m) => m !== "identity")
      .flatMap((m) => sources[m])
      .filter(({ src }) => /\b(prisma|tx)\.membership\./.test(src))
      .map(({ f }) => relative(MODULES_DIR, f).replace(/\\/g, "/"))
      .filter((f) => !MEMBERSHIP_PERMITIDO.has(f));

    expect(violacoes).toEqual([]);
  });
});
