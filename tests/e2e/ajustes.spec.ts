import { test, expect } from "./harness/fixtures";
import type { Locator, Page } from "@playwright/test";

const cards = (page: Page) => page.getByTestId("card-escala");
const verEscala = (card: Locator) => card.getByRole("link", { name: "Ver escala" });
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

async function topo(page: Page, texto: string) {
  // So o conteudo: o menu lateral (escondido no celular) repete os rotulos.
  const box = await page.locator("main").getByText(texto, { exact: true }).first().boundingBox();
  if (!box) throw new Error(`sem caixa: ${texto}`);
  return box.y;
}

async function bordaEsquerda(el: Locator) {
  return el.evaluate((e) => {
    const s = getComputedStyle(e);
    return { cor: s.borderLeftColor, largura: s.borderLeftWidth };
  });
}

test.describe("uma escala por grupo", () => {
  test.use({ storageState: "tests/e2e/.auth/umCard.json", viewport: { width: 390, height: 844 } });

  test("ordem da home", async ({ page }) => {
    await page.goto("/");
    await expect(cards(page)).toHaveCount(4);
    const ys = [
      await topo(page, "Você foi escalado!"),
      await topo(page, "Sua Escala Hoje"),
      await topo(page, "Próxima escala"),
      await topo(page, "Depois"),
      await topo(page, "Aniversariantes"),
    ];
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    await expect(page.getByText("Nenhuma escala próxima")).toHaveCount(0);
  });

  test("ver escala abre a data", async ({ page }) => {
    // Pendente 18/10, hoje 15/10, proxima 22/10, depois 29/10.
    const datas = [/18 de out/, /15 de out/, /22 de out/, /29 de out/];
    for (const [i, data] of datas.entries()) {
      await page.goto("/");
      await expect(cards(page)).toHaveCount(4);
      const link = verEscala(cards(page).nth(i));
      const href = await link.getAttribute("href");
      expect(href).toMatch(new RegExp(`^/escalas/data/${UUID}$`));
      await link.click();
      await expect(page).toHaveURL(href!);
      await expect(page.getByTestId("data-escala")).toHaveText(data);
      await expect(page.getByText("Intercessão", { exact: true })).toBeVisible();
    }
  });

  test("cor nos cartoes", async ({ page }) => {
    await page.goto("/");
    await expect(cards(page)).toHaveCount(4);
    for (const card of await cards(page).all()) {
      expect(await bordaEsquerda(card)).toEqual({ cor: "rgb(224, 96, 90)", largura: "4px" });
    }
  });

  test("cor nas escalas", async ({ page }) => {
    await page.goto("/escalas?mes=2026-10");
    const datas = page.getByTestId("cartao-data");
    await expect(datas.first()).toBeVisible();
    for (const card of await datas.all()) {
      expect(await bordaEsquerda(card)).toEqual({ cor: "rgb(224, 96, 90)", largura: "4px" });
    }

    await page.goto("/");
    await verEscala(cards(page).nth(1)).click();
    const marcador = page.getByTestId("cor-ministerio");
    await expect(marcador).toBeVisible();
    expect(await marcador.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(224, 96, 90)");
  });

  test("botao ver escala", async ({ page }) => {
    await page.goto("/");
    await expect(cards(page)).toHaveCount(4);
    for (const card of await cards(page).all()) {
      const link = verEscala(card);
      await link.scrollIntoViewIfNeeded();
      const box = await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await expect(link.locator("svg")).toHaveCount(1);
      // Intercessao nao tem repertorio.
      await expect(card.getByRole("link", { name: "Músicas" })).toHaveCount(0);
    }
  });

  test("musicas na data", async ({ page }) => {
    await page.goto("/");
    await verEscala(cards(page).nth(1)).click();
    await expect(page.getByTestId("data-escala")).toBeVisible();
    await expect(page.getByRole("link", { name: "Músicas" })).toHaveCount(0);
  });

  test("voltar ao inicio", async ({ page }) => {
    await page.goto("/");
    await verEscala(cards(page).nth(0)).click();
    await expect(page.getByTestId("data-escala")).toBeVisible();
    await page.getByRole("link", { name: "Início" }).first().click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("lider", () => {
  test.use({ storageState: "tests/e2e/.auth/lider.json" });

  test("equipe da data", async ({ page }) => {
    await page.goto("/");
    // Primeiro pendente da lider: Louvor 18/10, Bateria.
    await verEscala(page.getByTestId("grupo-escalado").getByTestId("card-escala").first()).click();
    await expect(page.getByTestId("data-escala")).toHaveText(/18 de out/);
    const linhas = page.getByTestId("vaga-equipe");
    await expect(linhas).toHaveCount(4);
    await expect(linhas.nth(0)).toHaveText(/^Bateria\s*Lia Lider\s*você\s*aguardando confirmação$/i);
    await expect(linhas.nth(1)).toHaveText(/^Teclado\s*— vaga aberta$/);
    await expect(linhas.nth(2)).toHaveText(/^Violão\s*Ana Beatriz Moreira$/);
    await expect(linhas.nth(3)).toHaveText(/^Vocal\s*Rafael Souza Lima$/);
  });

  test("musicas na data", async ({ page }) => {
    await page.goto("/");
    await verEscala(page.getByTestId("grupo-hoje").getByTestId("card-escala").first()).click();
    await expect(page).toHaveURL(new RegExp(`/escalas/data/${UUID}$`));
    const link = page.locator("main").getByRole("link", { name: "Músicas" });
    const href = await link.getAttribute("href");
    expect(href).toMatch(new RegExp(`^/repertorio/escala/${UUID}$`));
    await link.click();
    await expect(page).toHaveURL(href!);
    await expect(page.getByRole("heading", { name: "Músicas" })).toBeVisible();
  });

  test("botao musicas", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("grupo-hoje").getByTestId("card-escala").first();
    const link = card.getByRole("link", { name: "Músicas" });
    const box = await link.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await expect(link.locator("svg")).toHaveCount(1);
    const href = await link.getAttribute("href");
    expect(href).toMatch(new RegExp(`^/repertorio/escala/${UUID}$`));
    await link.click();
    await expect(page).toHaveURL(href!);
  });

  test("404 da data", async ({ page, browser }) => {
    const naoEncontrada = (p: Page) => p.getByRole("heading", { name: "Página não encontrada" });

    await page.goto("/escalas/data/abc");
    await expect(naoEncontrada(page)).toBeVisible();
    await expect(page.getByTestId("vaga-equipe")).toHaveCount(0);

    await page.goto("/");
    const href = await verEscala(page.getByTestId("grupo-escalado").getByTestId("card-escala").first()).getAttribute(
      "href",
    );
    const outra = await browser.newContext({ storageState: "tests/e2e/.auth/voluntario.json" });
    const voluntaria = await outra.newPage();
    await voluntaria.goto(href!);
    await expect(naoEncontrada(voluntaria)).toBeVisible();
    await expect(voluntaria.getByTestId("vaga-equipe")).toHaveCount(0);
    await outra.close();
  });

  test.describe("menu lateral", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("visao geral no menu", async ({ page, browser }) => {
      await page.goto("/");
      const menu = page.getByRole("navigation", { name: "Menu lateral" });
      await menu.getByRole("link", { name: "Visão geral" }).click();
      await expect(page).toHaveURL("/admin/visao-geral");
      await expect(menu.getByRole("link", { name: "Visão geral" })).toHaveAttribute("aria-current", "page");
      await expect(menu.getByRole("link", { name: "Gestão" })).not.toHaveAttribute("aria-current", "page");

      const outra = await browser.newContext({
        storageState: "tests/e2e/.auth/voluntario.json",
        viewport: { width: 1280, height: 800 },
      });
      const voluntaria = await outra.newPage();
      await voluntaria.goto("/");
      const menuVol = voluntaria.getByRole("navigation", { name: "Menu lateral" });
      await expect(menuVol.getByRole("link", { name: "Início" })).toBeVisible();
      await expect(menuVol.getByRole("link", { name: "Visão geral" })).toHaveCount(0);
      await outra.close();
    });
  });
});

test.describe("sem sessao", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("data sem sessao", async ({ page }) => {
    await page.goto("/escalas/data/3f6b1c2e-8d4a-4e7b-9c1d-2a5e6f7a8b9c");
    await expect(page).toHaveURL(/\/login/);
  });
});
