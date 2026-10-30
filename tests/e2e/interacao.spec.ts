import { test, expect } from "./harness/fixtures";
import type { Locator, Page } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/lider.json", viewport: { width: 1280, height: 800 } });

// Abre o sheet da primeira vaga vazia do dia 11, numa data ja passada mas gerenciavel.
async function abrirSheet(page: Page) {
  await page.goto("/escalas?mes=2026-10");
  await page.getByRole("button", { name: /^18 de outubro/ }).click();
  const gatilho = page.getByRole("button", { name: /Escalar|vaga aberta/i }).first();
  await gatilho.click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  return { dialogo, gatilho };
}

const centro = (l: Locator) =>
  l.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

test("mouse nao troca aba", async ({ page }) => {
  await page.goto("/vagas");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const titulo = await page.getByRole("heading", { name: "Lia" }).boundingBox();
  const x = titulo!.x + 10;
  const y = titulo!.y + 10;
  await page.mouse.move(x + 200, y);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 10 });
  await page.mouse.up();
  // /vagas ja foi compilada acima: se o gesto navegasse, a URL mudaria nesta janela.
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/\/$/);
});

test.describe("toque", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("toque troca aba", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const box = (await page.getByRole("heading", { name: "Lia" }).boundingBox())!;
    const y = box.y + 10;
    const cdp = await page.context().newCDPSession(page);
    const toque = (type: string, x?: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type: type as "touchStart",
        touchPoints: x === undefined ? [] : [{ x, y }],
      });
    await toque("touchStart", 300);
    for (const x of [270, 240, 200, 160, 130, 100]) await toque("touchMove", x);
    await toque("touchEnd");
    await expect(page).toHaveURL(/\/vagas$/);
  });
});

test("esc fecha sheet", async ({ page }) => {
  const { dialogo } = await abrirSheet(page);
  await page.keyboard.press("Escape");
  await expect(dialogo).toBeHidden();
});

test("esc fecha sheet com foco no body", async ({ page }) => {
  const { dialogo } = await abrirSheet(page);
  await dialogo.getByRole("button", { name: "+ Pessoa sem conta" }).click();
  await dialogo.getByRole("button", { name: "cancelar", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe("BODY");
  await page.keyboard.press("Escape");
  await expect(dialogo).toBeHidden();
});

test("esc na confirmacao mantem o sheet aberto", async ({ page }) => {
  await page.goto("/escalas?mes=2026-10");
  await page.getByRole("button", { name: /^18 de outubro/ }).click();
  await page.getByRole("button", { name: /Ana Beatriz Moreira/ }).click();
  const sheet = page.getByRole("dialog", { name: "Detalhes" });
  await sheet.getByRole("button", { name: "Trocar", exact: true }).click();
  await sheet.getByRole("button", { name: /João Pedro Almeida/ }).click();
  const confirmacao = page.getByRole("dialog", { name: "Trocar alocação?" });
  await expect(confirmacao).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirmacao).toBeHidden();
  await expect(sheet).toBeVisible();
});

test.describe("confirmacao", () => {
  test.use({ storageState: "tests/e2e/.auth/lider.json" });

  test("esc cancela confirmacao", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Não posso" }).first().click();
    const dialogo = page.getByRole("dialog", { name: "Recusar esta escala?" });
    await expect(dialogo).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByRole("button", { name: "Confirmar" })).toHaveCount(3);
  });

  test("dialogo acessivel: confirmacao", async ({ page }) => {
    await page.goto("/");
    const gatilho = page.getByRole("button", { name: "Não posso" }).first();
    await gatilho.focus();
    await page.keyboard.press("Enter");
    const dialogo = page.getByRole("dialog", { name: "Recusar esta escala?" });
    await expect(dialogo).toHaveAttribute("aria-modal", "true");
    await expect(dialogo).toBeFocused();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      expect(await dialogo.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    const cancelar = page.getByRole("button", { name: "Cancelar" });
    const recusar = page.getByRole("button", { name: "Recusar" });
    await cancelar.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(recusar).toBeFocused();
    await cancelar.click();
    await expect(gatilho).toBeFocused();
  });

  test("dialogo centralizado: confirmacao", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Não posso" }).first().click();
    const dialogo = page.getByRole("dialog", { name: "Recusar esta escala?" });
    await expect(dialogo).toBeVisible();
    await page.waitForTimeout(700);
    const c = await centro(dialogo);
    expect(Math.abs(c.x - 640)).toBeLessThanOrEqual(2);
    expect(Math.abs(c.y - 400)).toBeLessThanOrEqual(2);
  });
});

test("dialogo acessivel: sheet", async ({ page }) => {
  await page.goto("/escalas?mes=2026-10");
  await page.getByRole("button", { name: /^18 de outubro/ }).click();
  const gatilho = page.getByRole("button", { name: /Escalar|vaga aberta/i }).first();
  await gatilho.focus();
  await page.keyboard.press("Enter");
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toHaveAttribute("aria-modal", "true");
  await expect(dialogo).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await dialogo.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await dialogo.getByRole("button", { name: "Fechar" }).focus();
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialogo.evaluate(
      (el) => document.activeElement === [...el.querySelectorAll("button")].filter((b) => !b.disabled).at(-1),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(gatilho).toBeFocused();
});

test("dialogo centralizado: sheet", async ({ page }) => {
  const { dialogo } = await abrirSheet(page);
  await page.waitForTimeout(900);
  const c = await centro(dialogo);
  expect(Math.abs(c.x - 640)).toBeLessThanOrEqual(2);
  expect(Math.abs(c.y - 400)).toBeLessThanOrEqual(2);
  const fechar = dialogo.getByRole("button", { name: "Fechar" });
  await expect(fechar.getByText("Fechar")).toBeVisible();
  await fechar.click();
  await expect(dialogo).toBeHidden();
});

const semRolagem = (l: Locator) => l.evaluate((el) => el.scrollWidth - el.clientWidth);

test.describe("pendencias", () => {
  test.use({ storageState: "tests/e2e/.auth/confirmador.json" });
  test("pendencias visiveis e confirmaveis", async ({ page }) => {
    await page.goto("/");
    const secao = page.getByRole("heading", { name: "Você foi escalado!" }).locator("../..");
    const confirmar = secao.getByRole("button", { name: "Confirmar" });
    await expect(confirmar).toHaveCount(3);
    for (let i = 0; i < 3; i++) await expect(confirmar.nth(i)).toBeInViewport({ ratio: 1 });
    await expect(page.getByText("1 de 3")).toBeHidden();
    expect(await semRolagem(confirmar.first().locator("xpath=ancestor::div[contains(@class,'overflow-x-auto')]"))).toBe(0);

    for (const restantes of [2, 1, 0]) {
      await confirmar.first().click();
      await expect(confirmar).toHaveCount(restantes);
    }
  });
});

test("check-ins visiveis", async ({ page }) => {
  await page.goto("/");
  const botoes = page.getByRole("button", { name: "Fazer Check-in" });
  await expect(botoes).toHaveCount(2);
  await botoes.nth(1).scrollIntoViewIfNeeded();
  await expect(botoes.nth(0)).toBeInViewport({ ratio: 1 });
  await expect(botoes.nth(1)).toBeInViewport({ ratio: 1 });
  await expect(page.getByText("1 de 2")).toBeHidden();
  expect(await semRolagem(botoes.first().locator("xpath=ancestor::div[contains(@class,'overflow-x-auto')]"))).toBe(0);
});

test.describe("proximas", () => {
  test.use({ storageState: "tests/e2e/.auth/voluntario.json" });
  test("proximas visiveis", async ({ page }) => {
    await page.goto("/");
    const secao = page.locator("div.overflow-x-auto").last();
    await expect(secao.locator("> div")).toHaveCount(2);
    await secao.locator("> div").nth(1).scrollIntoViewIfNeeded();
    await expect(secao.locator("> div").nth(0)).toBeInViewport({ ratio: 1 });
    await expect(secao.locator("> div").nth(1)).toBeInViewport({ ratio: 1 });
    await expect(page.getByText("1 de 2")).toBeHidden();
    expect(await semRolagem(secao)).toBe(0);
  });
});

test("setas nomeadas", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "Mês anterior" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Próximo mês" })).toBeVisible();
});
