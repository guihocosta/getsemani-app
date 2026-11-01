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

  for (const [persona, grupo, itens] of [
    ["varios", "grupo-escalado", 2],
    ["lider", "grupo-escalado", 3],
    ["lider", "grupo-hoje", 2],
    ["varios", "grupo-hoje", 3],
    ["varios", "carrossel-depois", 2],
    ["voluntario", "carrossel-depois", 3],
  ] as const) {
    test.describe(`${grupo} ${itens}`, () => {
      test.use({ storageState: `tests/e2e/.auth/${persona}.json` });

      test(`largura web varios: ${grupo} com ${itens}`, async ({ page }) => {
        await page.goto("/");
        const grupoCards = page.getByTestId(grupo).getByTestId("card-escala");
        await expect(grupoCards).toHaveCount(itens);
        const [a, b, c] = await retangulos(grupoCards);
        expect(a.y).toBe(b.y);
        expect(b.x).toBeGreaterThan(a.x + a.width);
        expect(Math.round(b.width)).toBe(Math.round(a.width));
        if (c) {
          expect(c.y).toBeGreaterThan(a.y);
          expect(c.x).toBe(a.x);
          expect(Math.round(c.width)).toBe(Math.round(a.width));
        }
      });
    });
  }
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

test.describe("sem tema salvo, cedo", () => {
  test.use({ theme: null, colorScheme: "light" });

  test("padrao escuro no primeiro conteudo", async ({ page }) => {
    await page.addInitScript(() => {
      const estado = window as unknown as { escuroNoPrimeiroConteudo?: boolean };
      new MutationObserver(() => {
        if (estado.escuroNoPrimeiroConteudo !== undefined) return;
        // .assinatura, nao o primeiro filho: o Next poe um <div hidden> antes do script de tema.
        if (document.querySelector(".assinatura")) {
          estado.escuroNoPrimeiroConteudo = document.documentElement.classList.contains("dark");
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto("/login");
    const primeiro = await page.evaluate(
      () => (window as unknown as { escuroNoPrimeiroConteudo?: boolean }).escuroNoPrimeiroConteudo,
    );
    expect(primeiro).toBe(true);
  });

  test("padrao escuro com localStorage bloqueado", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("bloqueado");
        },
      });
    });
    await page.goto("/login");
    expect(await htmlEscuro(page)).toBe(true);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
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

async function pixels(page: Page, pontos: [number, number][]) {
  const png = (await page.screenshot()).toString("base64");
  return page.evaluate(
    async ({ png, pontos }) => {
      const imagem = new Image();
      imagem.src = `data:image/png;base64,${png}`;
      await imagem.decode();
      const tela = document.createElement("canvas");
      tela.width = imagem.width;
      tela.height = imagem.height;
      const contexto = tela.getContext("2d")!;
      contexto.drawImage(imagem, 0, 0);
      return pontos.map(([x, y]) => Array.from(contexto.getImageData(x, y, 1, 1).data).slice(0, 3));
    },
    { png, pontos },
  );
}

const luminancia = ([r, g, b]: number[]) => {
  const [a, c, d] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * a + 0.7152 * c + 0.0722 * d;
};

for (const [theme, largura] of [
  ["dark", 1280],
  ["light", 1280],
] as const) {
  test.describe(`item ativo ${theme}`, () => {
    test.use({ theme, storageState: "tests/e2e/.auth/lider.json", viewport: { width: largura, height: 800 } });

    test(`contraste do item ativo ${theme}`, async ({ page }) => {
      await page.goto("/escalas");
      const ativo = page.getByRole("navigation", { name: "Menu lateral" }).locator('[aria-current="page"]');
      await expect(ativo).toBeVisible();
      const [frente, fundo] = await ativo.evaluate((el) => {
        const estilo = getComputedStyle(el);
        return [estilo.color, estilo.backgroundColor].map((c) => c.match(/\d+/g)!.slice(0, 3).map(Number));
      });
      const [claro, escuro] = [luminancia(frente), luminancia(fundo)].sort((a, b) => b - a);
      expect((claro + 0.05) / (escuro + 0.05)).toBeGreaterThanOrEqual(4.5);
    });
  });
}

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

  test("brilho no login aparece na tela", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const [topo, meio, rodape] = await pixels(page, [
      [10, 10],
      [10, 750],
      [10, 843],
    ]);
    // Grafite em cima, azul crescendo ate o rodape.
    expect(Math.abs(topo[2] - 24)).toBeLessThanOrEqual(8);
    expect(meio[2]).toBeGreaterThan(topo[2] + 20);
    expect(rodape[2]).toBeGreaterThan(meio[2]);
    expect(rodape[2]).toBeGreaterThan(rodape[0] * 3);
  });

  test("grao no login aparece na tela", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    // Numa linha so o degrade e constante: variacao ali e grao.
    const linha = await pixels(page, Array.from({ length: 60 }, (_, i) => [i * 6, 800] as [number, number]));
    expect(new Set(linha.map((p) => p.join())).size).toBeGreaterThan(3);
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
