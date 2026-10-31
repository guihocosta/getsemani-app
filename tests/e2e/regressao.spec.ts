import { test, expect } from "./harness/fixtures";

test.use({ storageState: "tests/e2e/.auth/lider.json", viewport: { width: 1280, height: 800 } });

test("404 dentro do app em pt-BR com menu", async ({ page }) => {
  await page.goto("/repertorio/nao-e-uuid");
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  await expect(page.getByText("This page could not be found")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Menu lateral" })).toBeVisible();
});

test("404 de url desconhecida em pt-BR volta ao inicio", async ({ page }) => {
  await page.goto("/rota-que-nao-existe");
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  await page.getByRole("link", { name: "Voltar para o início" }).click();
  await expect(page).toHaveURL(/\/$/);
});

for (const theme of ["dark", "light"] as const) {
  test.describe(theme, () => {
    test.use({ theme });
    test(`sem aviso de hydration no tema ${theme}`, async ({ page }) => {
      const erros: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") erros.push(m.text());
      });
      await page.goto("/escalas/panorama?mes=2026-10");
      await page.waitForLoadState("networkidle");
      expect(erros.filter((e) => /hydrat/i.test(e))).toEqual([]);
    });
  });
}
