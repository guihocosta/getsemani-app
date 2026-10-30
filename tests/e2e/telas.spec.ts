import { test, expect } from "./harness/fixtures";
import type { Page } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/lider.json", viewport: { width: 1280, height: 800 } });

// A rota entra com animacao de 180 ms: medir antes disso pega posicao em transito.
const aguardarEntrada = (page: Page) => page.waitForTimeout(400);

test("panorama cabe com 5 datas", async ({ page }) => {
  await page.goto("/escalas/panorama?mes=2026-10");
  const tabela = page.getByRole("table");
  await expect(tabela.locator("thead th")).toHaveCount(6);
  // A celula mostra nome abreviado: o pior caso do criterio vai direto no DOM.
  await tabela.locator("tbody td span").evaluateAll((els) => {
    for (const el of els) el.textContent = "x".repeat(20);
  });
  const sobra = await tabela.locator("xpath=..").evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(sobra).toBe(0);
});

test("panorama rola por dentro com 10 datas", async ({ page }) => {
  await page.goto("/escalas/panorama?mes=2026-10");
  await page.getByRole("link", { name: "Mídia" }).click();
  const tabela = page.getByRole("table");
  await expect(tabela.locator("thead th")).toHaveCount(11);
  const caixa = tabela.locator("xpath=..");
  expect(await caixa.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(0);

  const funcao = tabela.getByRole("rowheader", { name: "Som" });
  const antes = (await funcao.boundingBox())!.x;
  const rolou = await caixa.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
    return el.scrollLeft;
  });
  expect(rolou).toBeGreaterThan(0);
  expect((await funcao.boundingBox())!.x).toBe(antes);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test.describe("1024", () => {
  test.use({ viewport: { width: 1024, height: 800 } });

  test("escalas lado a lado", async ({ page }) => {
    await page.goto("/escalas?mes=2026-10");
    const calendario = (await page.getByTestId("calendario").boundingBox())!;
    const lista = (await page.getByTestId("escalas-do-dia").boundingBox())!;
    expect(lista.x).toBeGreaterThanOrEqual(calendario.x + calendario.width);
    expect(lista.y).toBeLessThan(calendario.y + calendario.height);
  });

  test("dia nao move calendario", async ({ page }) => {
    await page.goto("/escalas?mes=2026-10");
    await aguardarEntrada(page);
    const antes = await page.getByTestId("calendario").boundingBox();
    await page.getByRole("button", { name: /^18 de outubro/ }).click();
    await expect(page.getByRole("heading", { name: /domingo, 18 de outubro/i })).toBeVisible();
    expect(await page.getByTestId("calendario").boundingBox()).toEqual(antes);
  });

  test("gestao em colunas", async ({ page }) => {
    await page.goto("/admin?vagasMes=2026-10");
    await aguardarEntrada(page);
    const blocos = page.getByTestId("resumo").locator("> section");
    await expect(blocos).toHaveCount(4);
    const primeiro = (await blocos.nth(0).boundingBox())!;
    const segundo = (await blocos.nth(1).boundingBox())!;
    expect(segundo.x).toBeGreaterThan(primeiro.x);
    expect(segundo.y).toBe(primeiro.y);

    await expect(page.getByRole("link", { name: /^Ministérios/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^Pessoas\b(?! sem conta)/ })).toHaveCount(0);

    await page.goto("/admin?vagasMes=2027-06");
    await expect(page.getByText("Nenhuma vaga em aberto neste mês")).toBeVisible();
  });

  test("visao geral em colunas", async ({ page }) => {
    await page.goto("/admin/visao-geral");
    const itens = page.locator("main ul.grid > li");
    await expect(itens).toHaveCount(6);
    const ys = await itens.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().y));
    expect(ys.filter((y) => y === ys[0]).length).toBeGreaterThanOrEqual(3);
  });
});
