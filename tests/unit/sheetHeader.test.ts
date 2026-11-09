import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Sheet } from "@/ui/Sheet";

describe("Sheet", () => {
  it("titulo e x no cabecalho", () => {
    const html = renderToStaticMarkup(
      createElement(Sheet, { open: true, onClose: () => {}, title: "Teste", children: createElement("p", null, "corpo") }),
    );
    // Cabecalho = o pai comum do titulo e do botao; o corpo vem depois dele.
    const titulo = html.indexOf(">Teste</h2>");
    const fechar = html.indexOf('aria-label="Fechar"');
    const corpo = html.indexOf("<p>corpo</p>");
    expect(titulo).toBeGreaterThan(-1);
    expect(fechar).toBeGreaterThan(titulo);
    expect(corpo).toBeGreaterThan(fechar);
    const entre = html.slice(titulo, fechar);
    // Titulo e botao no mesmo bloco: entre eles fecha so o wrapper do titulo.
    expect(entre.match(/<\/div>/g)?.length ?? 0).toBe(1);
    expect(html).not.toMatch(/>Fechar</);
  });
});
