import { test, expect } from "./harness/fixtures";

const lateral = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Menu lateral" });

test.use({ storageState: "tests/e2e/.auth/lider.json", viewport: { width: 1280, height: 800 } });

test.describe("corte em 1024", () => {
  for (const [largura, temMenu] of [
    [1023, false],
    [1024, true],
  ] as const) {
    test.describe(`${largura}`, () => {
      test.use({ viewport: { width: largura, height: 800 } });
      test(`corte em 1024: ${largura}`, async ({ page }) => {
        await page.goto("/");
        const barra = page.getByRole("link", { name: "Vagas" }).last();
        if (temMenu) {
          await expect(lateral(page)).toBeVisible();
          await expect(page.getByRole("navigation")).toHaveCount(1);
        } else {
          await expect(lateral(page)).toBeHidden();
          await expect(barra).toBeVisible();
        }
      });
    });
  }
});

test("item ativo no menu", async ({ page }) => {
  await page.goto("/escalas/panorama");
  const ativos = lateral(page).locator('[aria-current="page"]');
  await expect(ativos).toHaveCount(1);
  await expect(ativos).toHaveText("Panorama");
});

test("cada item abre a rota", async ({ page }) => {
  const ROTAS = [
    ["Início", /\/$/],
    ["Vagas", /\/vagas$/],
    ["Escalas", /\/escalas$/],
    ["Panorama", /\/escalas\/panorama$/],
    ["Agenda", /\/indisponibilidade$/],
    ["Avisos", /\/avisos$/],
    ["Repertório", /\/repertorio$/],
    ["Aniversariantes", /\/aniversariantes$/],
    ["Gestão", /\/admin$/],
    ["Perfil", /\/perfil$/],
  ] as const;
  await page.goto("/perfil");
  await expect(lateral(page).getByRole("link")).toHaveCount(ROTAS.length);
  for (const [nome, url] of ROTAS) {
    await lateral(page).getByRole("link", { name: nome }).click();
    await expect(page).toHaveURL(url);
  }
});

test.describe("ponto de pendencia", () => {
  test("ponto de pendencia: 1 pedido mostra", async ({ page }) => {
    await page.goto("/");
    await expect(lateral(page).getByTestId("pendencia")).toBeVisible();
  });

  test.describe("sem pedido", () => {
    test.use({ storageState: "tests/e2e/.auth/liderSemPendencia.json" });
    test("ponto de pendencia: 0 pedidos nao mostra", async ({ page }) => {
      await page.goto("/");
      await expect(lateral(page).getByRole("link", { name: "Gestão" })).toBeVisible();
      await expect(lateral(page).getByTestId("pendencia")).toHaveCount(0);
    });
  });
});

test.describe("janela baixa", () => {
  test.use({ viewport: { width: 1024, height: 600 } });
  test("menu fixo com a pagina rolada e Perfil alcancavel", async ({ page }) => {
    await page.goto("/admin");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(lateral(page)).toBeInViewport();
    const perfil = lateral(page).getByRole("link", { name: "Perfil" });
    await perfil.scrollIntoViewIfNeeded();
    await expect(perfil).toBeInViewport();
  });
});

test("erro mantem menu", async ({ page }) => {
  await page.goto("/escalas/nao-e-uuid/editar");
  await expect(page.getByText("Algo deu errado")).toBeVisible();
  await expect(lateral(page)).toBeVisible();
});

for (const largura of [1024, 1280, 1920]) {
  test.describe(`largura ${largura}`, () => {
    test.use({ viewport: { width: largura, height: 800 } });
    for (const rota of ["/", "/vagas", "/escalas", "/escalas/panorama", "/admin", "/admin/visao-geral"]) {
      test(`sem rolagem horizontal: ${rota} ${largura}`, async ({ page }) => {
        await page.goto(rota);
        await page.waitForLoadState("networkidle");
        const sobra = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(sobra).toBe(0);
      });
    }
  });
}

for (const rota of ["/escalas/nova", "/perfil", "/indisponibilidade"]) {
  test(`formulario em coluna: ${rota}`, async ({ page }) => {
    await page.goto(rota);
    const largura = await page.locator("main > div").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(largura).toBeGreaterThan(0);
    expect(largura).toBeLessThanOrEqual(448);
  });
}
