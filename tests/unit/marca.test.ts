import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

function bloco(inicio: string): string {
  const de = css.indexOf(inicio);
  expect(de).toBeGreaterThanOrEqual(0);
  return css.slice(de, css.indexOf("}", de));
}

function token(blocoCss: string, nome: string): string | undefined {
  return blocoCss.match(new RegExp(`--color-${nome}:\\s*(#[0-9a-fA-F]{6})`))?.[1].toLowerCase();
}

const CLARO = bloco("@theme");
const ESCURO = bloco(".dark {");

function varrer(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return nome === "fonts" ? [] : varrer(caminho);
    return /\.(tsx?|css|html|js|webmanifest)$/.test(nome) ? [caminho] : [];
  });
}

const FONTES = ["app", "src", "public"].flatMap(varrer);

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

describe("marca", () => {
  it.each([
    ["bg", "#141518"],
    ["surface", "#1c1e23"],
    ["border", "#2b2e35"],
    ["text", "#f4f6f9"],
    ["text-muted", "#8c929c"],
    ["primary", "#308ef0"],
    ["danger", "#e0605a"],
  ])("tokens escuro: %s", (nome, valor) => {
    expect(token(ESCURO, nome)).toBe(valor);
  });

  it.each([
    ["bg", "#f4f6f9"],
    ["surface", "#ffffff"],
    ["text", "#141518"],
    ["primary", "#164f94"],
  ])("tokens claro: %s", (nome, valor) => {
    expect(token(CLARO, nome)).toBe(valor);
  });

  it("preenchimento usa brand nos dois temas", () => {
    expect(token(CLARO, "brand")).toBe("#2a78cd");
    expect(token(CLARO, "brand-hover")).toBe("#164f94");
    // Sem sobrescrever no escuro: o azul da marca e o mesmo nos dois temas.
    expect(token(ESCURO, "brand")).toBeUndefined();
    expect(token(ESCURO, "brand-hover")).toBeUndefined();
    const errados = FONTES.filter((f) => /bg-primary\s[^"`]*text-white|text-white[^"`]*\sbg-primary\b(?!\/)/.test(readFileSync(f, "utf8")));
    expect(errados).toEqual([]);
    expect(readFileSync("src/ui/Button.tsx", "utf8")).toContain("bg-brand text-white shadow-premium hover:bg-brand-hover");
  });

  it.each([
    ["primary claro", CLARO, "primary", "surface"],
    ["primary claro sobre fundo", CLARO, "primary", "bg"],
    ["text-muted claro", CLARO, "text-muted", "surface"],
    ["primary escuro", ESCURO, "primary", "surface"],
    ["primary escuro sobre fundo", ESCURO, "primary", "bg"],
    ["text-muted escuro", ESCURO, "text-muted", "surface"],
  ])("contraste: %s", (_nome, tema, frente, fundo) => {
    expect(contraste(token(tema, frente)!, token(tema, fundo)!)).toBeGreaterThanOrEqual(4.5);
  });

  it("contraste: branco sobre brand", () => {
    expect(contraste("#ffffff", token(CLARO, "brand")!)).toBeGreaterThanOrEqual(4.5);
  });

  it("contraste: danger claro segue como excecao conhecida", () => {
    expect(contraste(token(CLARO, "danger")!, token(CLARO, "surface")!)).toBeLessThan(4.5);
    expect(contraste(token(ESCURO, "danger")!, token(ESCURO, "surface")!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["#4f46e5", "#6366f1", "#6d28d9", "#020617", "rgba(79,70,229", "indigo-"])("sem cor antiga: %s", (cor) => {
    const achados = FONTES.filter((f) => readFileSync(f, "utf8").toLowerCase().includes(cor));
    expect(achados).toEqual([]);
  });

  it("sem text-success", () => {
    expect(FONTES.filter((f) => readFileSync(f, "utf8").includes("text-success"))).toEqual([]);
  });

  it("cor padrao de ministerio e so padrao", () => {
    expect(readFileSync("app/(app)/admin/ministerios/CreateMinistryForm.tsx", "utf8")).toContain('defaultValue="#2a78cd"');
    expect(readFileSync("app/(app)/admin/ministerios/EditMinistryForm.tsx", "utf8")).toContain('defaultValue={color ?? "#2a78cd"}');
    expect(readFileSync("app/(app)/admin/ministerios/MinistryCard.tsx", "utf8")).toContain('m.color ?? "#2a78cd"');
  });

  it("grafite fora do app", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
    expect(manifest.background_color).toBe("#141518");
    expect(manifest.theme_color).toBe("#141518");

    const offline = readFileSync("public/offline.html", "utf8");
    expect(offline).toContain("background: #141518");
    expect(offline).not.toMatch(/#f8fafc|#0f172a/);

    const erro = readFileSync("app/global-error.tsx", "utf8");
    expect(erro).toContain('import "./globals.css"');
    expect(erro).toContain('className="dark"');
    expect(erro).toContain("bg-brand");
    expect(erro).not.toMatch(/slate-|bg-white/);

    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).toContain('dark ? "#141518" : "#f4f6f9"');
    expect(layout).not.toMatch(/#f8fafc/);

    // AD-011: licenca da Monument nao cobre entregar o arquivo ao navegador.
    expect(readdirSync("public/fonts").filter((f) => /monument/i.test(f))).toEqual([]);
  });

  it.each([
    "app/layout.tsx",
    "app/(app)/InstallGuide.tsx",
    "app/(app)/PushRegister.tsx",
    "app/api/push/test/route.ts",
    "src/ui/AppShell.tsx",
    "public/manifest.webmanifest",
    "public/offline.html",
    "public/sw.js",
  ])("nome com acento: %s", (arquivo) => {
    const texto = readFileSync(arquivo, "utf8");
    expect(texto).toContain("Getsêmani");
    expect(texto).not.toContain("Getsemani");
  });
});
