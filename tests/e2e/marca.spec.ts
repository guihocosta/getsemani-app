import { test, expect } from "./harness/fixtures";
import type { Locator, Page } from "@playwright/test";

const cards = (page: Page) => page.getByTestId("card-escala");

async function larguras(lista: Locator) {
  const caixas = await lista.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
  return caixas.map((l) => Math.round(l));
}

// Tudo na mesma leitura: a transicao de entrada da pagina move os cards entre duas.
const retangulos = (lista: Locator) =>
  lista.evaluateAll((els) =>
    els.map((el) => {
      const { x, y, width } = el.getBoundingClientRect();
      return { x, y, width };
    }),
  );

const themeColor = (page: Page) => page.locator('meta[name="theme-color"]').getAttribute("content");
const htmlEscuro = (page: Page) => page.evaluate(() => document.documentElement.classList.contains("dark"));

test.describe("cards no celular", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.describe("voluntaria com varias escalas", () => {
    test.use({ storageState: "tests/e2e/.auth/voluntario.json" });

    test("largura celular varios", async ({ page }) => {
      await page.goto("/");
      await expect(cards(page)).toHaveCount(4);
      expect(await larguras(cards(page))).toEqual([358, 358, 358, 358]);
      await expect(page.getByText("1 de 3")).toBeVisible();
    });

    test("contador do carrossel", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("1 de 3")).toBeVisible();
      // O onScroll so existe depois de hidratar.
      await page.waitForLoadState("networkidle");
      const carrossel = page.getByTestId("carrossel-depois");
      await carrossel.evaluate((el) => el.scrollBy({ left: el.clientWidth }));
      await expect(page.getByText("2 de 3")).toBeVisible();
    });
  });

  test.describe("uma escala por grupo", () => {
    test.use({ storageState: "tests/e2e/.auth/umCard.json" });

    test("largura celular um card", async ({ page }) => {
      await page.goto("/");
      await expect(cards(page)).toHaveCount(4);
      expect(await larguras(cards(page))).toEqual([358, 358, 358, 358]);
    });
  });
});

test.describe("cards na web", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.describe("uma escala por grupo", () => {
    test.use({ storageState: "tests/e2e/.auth/umCard.json" });

    test("largura web um card", async ({ page }) => {
      await page.goto("/");
      await expect(cards(page)).toHaveCount(4);
      const lista = await larguras(cards(page));
      expect(lista[0]).toBeGreaterThan(900);
      expect(new Set(lista).size).toBe(1);
    });
  });

  test.describe("varias escalas", () => {
    test("largura web varios: 3 itens", async ({ browser }) => {
      const contexto = await browser.newContext({
        storageState: "tests/e2e/.auth/voluntario.json",
        viewport: { width: 1280, height: 800 },
      });
      const page = await contexto.newPage();
      await page.goto("/");
      const depois = page.getByTestId("carrossel-depois").getByTestId("card-escala");
      await expect(depois).toHaveCount(3);
      const [a, b, c] = await retangulos(depois);
      expect(a.y).toBe(b.y);
      expect(Math.round(a.width)).toBe(Math.round(b.width));
      expect(c.y).toBeGreaterThan(a.y);
      expect(Math.round(c.width)).toBe(Math.round(a.width));
      await contexto.close();
    });

    test("largura web varios: 2 itens", async ({ browser }) => {
      const contexto = await browser.newContext({
        storageState: "tests/e2e/.auth/lider.json",
        viewport: { width: 1280, height: 800 },
      });
      const page = await contexto.newPage();
      await page.goto("/");
      const hoje = page.getByTestId("grupo-hoje").getByTestId("card-escala");
      await expect(hoje).toHaveCount(2);
      const [a, b] = await retangulos(hoje);
      expect(a.y).toBe(b.y);
      expect(b.x).toBeGreaterThan(a.x + a.width);
      await contexto.close();
    });
  });
});

test.describe("tema escuro", () => {
  test.use({ theme: "dark" });

  test("color-scheme escuro", async ({ page }) => {
    await page.goto("/login");
    const esquema = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    expect(esquema).toBe("dark");
  });

  test.describe("com sessao", () => {
    test.use({ storageState: "tests/e2e/.auth/umCard.json", viewport: { width: 390, height: 844 } });

    test("check-in com cor", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Fazer Check-in" }).click();
      const feito = page.getByText("Check-in feito");
      await expect(feito).toBeVisible();
      await expect(feito).toHaveCSS("color", "rgb(48, 142, 240)");
    });
  });
});

test.describe("sem tema salvo", () => {
  test.use({ theme: null, colorScheme: "light" });

  test("padrao escuro", async ({ page }) => {
    await page.goto("/login");
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
    expect(await htmlEscuro(page)).toBe(true);
    expect(await themeColor(page)).toBe("#141518");
  });
});

test.describe("tema salvo", () => {
  test.use({ theme: "light", colorScheme: "dark" });

  test("claro salvo", async ({ page }) => {
    await page.goto("/login");
    expect(await htmlEscuro(page)).toBe(false);
    expect(await themeColor(page)).toBe("#f4f6f9");
  });
});

test.describe("botao de tema", () => {
  test.use({ theme: null, storageState: "tests/e2e/.auth/lider.json" });

  test("botao de tema", async ({ page }) => {
    await page.goto("/perfil");
    expect(await htmlEscuro(page)).toBe(true);
    await page.getByRole("button", { name: "Ativar tema claro" }).click();
    expect(await htmlEscuro(page)).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("light");
    expect(await themeColor(page)).toBe("#f4f6f9");

    await page.reload();
    expect(await htmlEscuro(page)).toBe(false);
    await page.getByRole("button", { name: "Ativar tema escuro" }).click();
    expect(await htmlEscuro(page)).toBe(true);
    expect(await themeColor(page)).toBe("#141518");
  });
});

async function simboloCorreto(imagem: Locator, arquivo: string) {
  await expect(imagem).toBeVisible();
  expect(await imagem.getAttribute("src")).toContain(arquivo);
  const dados = await imagem.evaluate((el: HTMLImageElement) => {
    const estilo = getComputedStyle(el);
    const { width, height } = el.getBoundingClientRect();
    return { natural: el.naturalWidth, width, height, sombra: estilo.boxShadow, filtro: estilo.filter };
  });
  expect(dados.natural).toBeGreaterThan(0);
  expect(dados.height).toBeGreaterThanOrEqual(24);
  expect(dados.width / dados.height).toBeCloseTo(204 / 219, 1);
  expect(dados.sombra).toBe("none");
  expect(dados.filtro).toBe("none");
}

test.describe("simbolo no menu", () => {
  test.use({ storageState: "tests/e2e/.auth/lider.json", viewport: { width: 1280, height: 800 } });

  for (const [theme, arquivo] of [
    ["light", "simbolo-azul"],
    ["dark", "simbolo-branco"],
  ] as const) {
    test.describe(theme, () => {
      test.use({ theme });

      test(`simbolo no menu ${theme}`, async ({ page }) => {
        await page.goto("/");
        const menu = page.getByRole("navigation", { name: "Menu lateral" });
        await expect(menu.getByText("Getsêmani")).toBeVisible();
        await simboloCorreto(menu.locator("img:visible"), arquivo);
      });
    });
  }
});

test.describe("login", () => {
  test.use({ theme: "light", viewport: { width: 390, height: 844 } });

  test("simbolo no login", async ({ page }) => {
    await page.goto("/login");
    await simboloCorreto(page.getByRole("img", { name: "Getsêmani" }), "simbolo-branco");
    await expect(page.locator(".assinatura")).toHaveCSS("background-color", "rgb(20, 21, 24)");
  });

  test("brilho no login", async ({ page }) => {
    await page.goto("/login");
    const brilho = await page.locator(".assinatura").evaluate((el) => {
      const estilo = getComputedStyle(el, "::before");
      return {
        altura: parseFloat(estilo.height) / el.clientHeight,
        fundo: parseFloat(estilo.bottom),
        imagem: estilo.backgroundImage,
      };
    });
    expect(brilho.altura).toBeGreaterThanOrEqual(0.3);
    expect(brilho.altura).toBeLessThanOrEqual(0.4);
    expect(brilho.fundo).toBe(0);
    expect(brilho.imagem).toContain("gradient");
  });

  test("grao no login", async ({ page }) => {
    await page.goto("/login");
    const grao = await page.locator(".assinatura").evaluate((el) => {
      const estilo = getComputedStyle(el, "::after");
      return {
        opacidade: estilo.opacity,
        mistura: estilo.mixBlendMode,
        animacao: estilo.animationName,
        imagem: estilo.backgroundImage,
      };
    });
    expect(grao.opacidade).toBe("0.07");
    expect(grao.mistura).toBe("overlay");
    expect(grao.animacao).toBe("none");
    expect(grao.imagem).toContain("feTurbulence");

    // trial: confere que nada cobre o botao sem abrir o OAuth do Google.
    const entrar = page.getByRole("button", { name: "Entrar com Google" });
    await entrar.click({ trial: true });
    await entrar.focus();
    await expect(entrar).toBeFocused();
  });
});

test.describe("telas de uso", () => {
  test.use({ storageState: "tests/e2e/.auth/lider.json" });

  for (const rota of ["/", "/escalas", "/perfil"]) {
    test(`sem assinatura fora do login: ${rota}`, async ({ page }) => {
      await page.goto(rota);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.locator(".assinatura")).toHaveCount(0);
    });
  }
});
