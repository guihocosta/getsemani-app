import { test, expect } from "./harness/fixtures";

const ROTAS = [
  ["home", "/"],
  ["escalas", "/escalas?mes=2026-10"],
  ["panorama", "/escalas/panorama?mes=2026-10"],
  ["admin", "/admin?vagasMes=2026-10"],
  ["visao-geral", "/admin/visao-geral"],
] as const;

test.use({ storageState: "tests/e2e/.auth/lider.json" });

test.describe("login sem sessao", () => {
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } });

  test("celular igual ao commit base: login 390", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("login-390.png", { fullPage: true, animations: "disabled" });
  });
});

for (const largura of [390, 768]) {
  for (const theme of ["light", "dark"] as const) {
    test.describe(`baseline ${largura} ${theme}`, () => {
      test.use({ theme, viewport: { width: largura, height: 844 } });

      for (const [nome, rota] of ROTAS) {
        test(`celular igual ao commit base: ${nome} ${largura} ${theme}`, async ({ page }) => {
          await page.goto(rota);
          await page.waitForLoadState("networkidle");
          await expect(page).toHaveScreenshot(`${nome}-${largura}-${theme}.png`, {
            fullPage: true,
            animations: "disabled",
          });
        });
      }
    });
  }
}
