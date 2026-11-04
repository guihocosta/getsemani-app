import { describe, it, expect } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Geral from "@app/(app)/loading";
import Escalas from "@app/(app)/escalas/loading";
import Panorama from "@app/(app)/escalas/panorama/loading";
import VisaoGeral from "@app/(app)/admin/visao-geral/loading";

const html = (C: ComponentType) => renderToStaticMarkup(createElement(C));
const conta = (s: string, trecho: string) => s.split(trecho).length - 1;

describe("esqueletos", () => {
  it.each([
    ["geral", Geral],
    ["escalas", Escalas],
    ["panorama", Panorama],
    ["visao geral", VisaoGeral],
  ])("esqueleto anunciado: %s", (_nome, C) => {
    const s = html(C);
    expect(s).toMatch(/^<div role="status" aria-busy="true"/);
    expect(s).toContain('<span class="sr-only">Carregando…</span>');
  });

  it("formato do esqueleto: escalas 7 colunas e 35 dias, panorama linhas, visao geral 6 cartoes", () => {
    const escalas = html(Escalas);
    const dias = escalas.split('data-testid="esqueleto-dias"')[1].split("</div></div>")[0];
    expect(escalas).toContain('class="grid grid-cols-7 gap-1 mb-6" data-testid="esqueleto-dias"');
    expect(conta(dias, "aspect-square")).toBe(35);

    expect(conta(html(Panorama), 'data-testid="esqueleto-linha"')).toBe(6);
    expect(conta(html(VisaoGeral), 'data-testid="esqueleto-cartao"')).toBe(6);
  });
});
