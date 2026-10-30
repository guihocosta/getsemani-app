import { describe, expect, it } from "vitest";
import { activeHref, isWideRoute, navItems } from "@/ui/navItems";

const labels = (flags: { isAdmin: boolean; isLeader: boolean; hasRepertoire: boolean }) =>
  navItems(flags).map((i) => i.label);

const BASE_INICIO = ["Início", "Vagas", "Escalas", "Panorama", "Agenda", "Avisos"];

describe("navItems", () => {
  it.each([
    [
      "voluntario sem repertorio",
      { isAdmin: false, isLeader: false, hasRepertoire: false },
      [...BASE_INICIO, "Aniversariantes", "Perfil"],
    ],
    [
      "voluntario com repertorio",
      { isAdmin: false, isLeader: false, hasRepertoire: true },
      [...BASE_INICIO, "Repertório", "Aniversariantes", "Perfil"],
    ],
    [
      "lider",
      { isAdmin: false, isLeader: true, hasRepertoire: true },
      [...BASE_INICIO, "Repertório", "Aniversariantes", "Gestão", "Perfil"],
    ],
    [
      "admin sem ministerio",
      { isAdmin: true, isLeader: false, hasRepertoire: false },
      [...BASE_INICIO, "Aniversariantes", "Gestão", "Perfil"],
    ],
  ])("itens por permissao: %s", (_nome, flags, esperado) => {
    expect(labels(flags)).toEqual(esperado);
  });

  it("barra inferior mantem as abas de antes", () => {
    const tabs = (flags: { isAdmin: boolean; isLeader: boolean; hasRepertoire: boolean }) =>
      navItems(flags)
        .filter((i) => i.tab)
        .map((i) => i.href);
    expect(tabs({ isAdmin: false, isLeader: false, hasRepertoire: true })).toEqual([
      "/",
      "/vagas",
      "/escalas",
      "/perfil",
    ]);
    expect(tabs({ isAdmin: false, isLeader: true, hasRepertoire: false })).toEqual([
      "/",
      "/vagas",
      "/escalas",
      "/admin",
      "/perfil",
    ]);
  });
});

describe("activeHref", () => {
  const hrefs = navItems({ isAdmin: true, isLeader: true, hasRepertoire: true }).map((i) => i.href);

  it.each([
    ["/escalas/panorama", "/escalas/panorama"],
    ["/escalas/nova", "/escalas"],
    ["/escalas", "/escalas"],
    ["/repertorio/escala/abc", "/repertorio"],
    ["/indisponibilidade", "/indisponibilidade"],
    ["/", "/"],
    ["/admin/visao-geral", "/admin"],
  ])("item ativo em %s", (pathname, esperado) => {
    expect(activeHref(pathname, hrefs)).toBe(esperado);
  });

  it("item ativo: prefixo sem barra nao conta e rota fora do menu nao marca nada", () => {
    expect(activeHref("/escalasx", hrefs)).toBeUndefined();
    expect(activeHref("/solicitacoes", hrefs)).toBeUndefined();
  });
});

describe("isWideRoute", () => {
  it("so telas densas usam a largura", () => {
    expect(["/", "/escalas", "/escalas/panorama", "/admin", "/admin/visao-geral"].every(isWideRoute)).toBe(true);
    expect(["/escalas/nova", "/perfil", "/indisponibilidade", "/admin/pessoas"].some(isWideRoute)).toBe(false);
  });
});
