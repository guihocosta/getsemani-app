import { test, expect } from "./harness/fixtures";
import type { Locator, Page } from "@playwright/test";

// Lia lidera o Louvor. Em 18/10 (agora = 15/10) ela mesma esta PENDING na
// Bateria e Ana Beatriz confirmou o Violao. Ninguem do seed tem push cadastrado.
test.use({ storageState: "tests/e2e/.auth/lider.json" });

async function cartao(page: Page, dia: string, mes = "2026-10"): Promise<Locator> {
  await page.goto(`/escalas?mes=${mes}`);
  await page.getByRole("button", { name: new RegExp(`^${dia}`) }).click();
  const c = page.getByTestId("cartao-data").filter({ hasText: "Louvor" });
  await expect(c).toBeVisible();
  return c;
}

async function abrirVaga(page: Page, nome: RegExp): Promise<Locator> {
  const c = await cartao(page, "18 de outubro");
  await c.getByRole("button", { name: nome }).click();
  const dialogo = page.getByRole("dialog", { name: "Detalhes" });
  await expect(dialogo).toBeVisible();
  // Espera a mola do painel assentar antes de medir.
  await page.waitForTimeout(900);
  return dialogo;
}

test.describe("celular", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("lembrar pendentes da data", async ({ page }) => {
    const c = await cartao(page, "18 de outubro");
    await c.getByRole("button", { name: "Mais ações" }).click();
    await c.getByRole("button", { name: "Lembrar pendentes (1)" }).click();
    const confirmacao = page.getByRole("dialog", { name: "Lembrar 1 pessoa que não confirmou?" });
    await expect(confirmacao).toBeVisible();
    await confirmacao.getByRole("button", { name: "Lembrar" }).click();
    await expect(c.getByText("1 sem notificações ativadas", { exact: true })).toBeVisible();
  });

  test("menu sem pendentes", async ({ page }) => {
    for (const [dia, mes] of [
      ["11 de outubro", "2026-10"],
      ["8 de novembro", "2026-11"],
    ]) {
      const c = await cartao(page, dia, mes);
      await c.getByRole("button", { name: "Mais ações" }).click();
      await expect(c.getByRole("button", { name: "Mudar horário" })).toBeVisible();
      await expect(c.getByRole("button", { name: /Lembrar pendentes/ })).toHaveCount(0);
    }
  });

  test("lembrar uma pessoa", async ({ page }) => {
    let dialogo = await abrirVaga(page, /Ana Beatriz Moreira/);
    await expect(dialogo.getByRole("button", { name: "Lembrar confirmação" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();

    dialogo = await abrirVaga(page, /Lia Lider/);
    await dialogo.getByRole("button", { name: "Lembrar confirmação" }).click();
    await expect(dialogo.getByRole("status")).toHaveText("Sem notificações ativadas");
  });
});

test.describe("convidado", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("convidado sem lembrete", async ({ page }) => {
    // Ze Visitante (sem conta, status PENDING) no Teclado de 01/11.
    const c = await cartao(page, "1 de novembro", "2026-11");
    await c.getByRole("button", { name: /Zé Visitante/ }).click();
    const dialogo = page.getByRole("dialog", { name: "Detalhes" });
    await expect(dialogo.getByText("Zé Visitante")).toBeVisible();
    await expect(dialogo.getByRole("button", { name: "Lembrar confirmação" })).toHaveCount(0);
  });
});

for (const largura of [390, 1280]) {
  test.describe(`modal em ${largura}`, () => {
    test.use({ viewport: { width: largura, height: largura === 390 ? 844 : 800 } });

    test(`x no canto ${largura}`, async ({ page }) => {
      const dialogo = await abrirVaga(page, /Ana Beatriz Moreira/);
      const painel = (await dialogo.boundingBox())!;
      const x = (await dialogo.getByRole("button", { name: "Fechar" }).boundingBox())!;
      expect(x.width).toBeGreaterThanOrEqual(44);
      expect(x.height).toBeGreaterThanOrEqual(44);
      expect(painel.x + painel.width - (x.x + x.width)).toBeLessThanOrEqual(24);
      expect(x.y - painel.y).toBeLessThanOrEqual(80);
      await expect(dialogo.getByText("Fechar", { exact: true })).toHaveCount(0);
    });

    test(`alca no celular ${largura}`, async ({ page }) => {
      const dialogo = await abrirVaga(page, /Ana Beatriz Moreira/);
      const alca = dialogo.getByTestId("alca");
      if (largura === 390) {
        await expect(alca).toBeVisible();
        expect(await alca.evaluate((el) => el.tagName !== "BUTTON" && el.closest("button") === null)).toBe(true);
      } else {
        await expect(alca).toBeHidden();
      }
    });
  });
}

test.describe("fechar", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  // Uma pagina nova por jeito: com o relogio fixo do harness, a animacao de
  // saida do framer trava na segunda abertura da mesma pagina.
  const JEITOS: [string, (p: Page, d: Locator) => Promise<void>][] = [
    ["x", (_p, d) => d.getByRole("button", { name: "Fechar" }).click()],
    ["fora", (p) => p.mouse.click(10, 10)],
    ["esc", (p) => p.keyboard.press("Escape")],
  ];
  for (const [nome, fechar] of JEITOS) {
    test(`fecha de tres jeitos: ${nome}`, async ({ page }) => {
      const dialogo = await abrirVaga(page, /Ana Beatriz Moreira/);
      await fechar(page, dialogo);
      await expect(dialogo).toBeHidden();
    });
  }

  test("so o simbolo", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("navigation", { name: "Menu lateral" });
    await expect(menu.getByRole("img", { name: "Getsêmani" })).toBeVisible();
    await expect(menu.getByText("Getsêmani", { exact: true })).toHaveCount(0);
  });
});
