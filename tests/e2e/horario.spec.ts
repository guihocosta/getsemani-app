import { test, expect } from "./harness/fixtures";
import type { Page } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/lider.json", viewport: { width: 390, height: 844 } });

async function abrirData(page: Page, mes: string, dia: RegExp) {
  await page.goto(`/escalas?mes=${mes}`);
  await page.getByRole("button", { name: dia }).click();
  const card = page.getByRole("listitem").filter({ hasText: "Culto Louvor" });
  await expect(card).toBeVisible();
  return card;
}

async function abrirFolha(page: Page, mes: string, dia: RegExp) {
  const card = await abrirData(page, mes, dia);
  await card.getByRole("button", { name: "Mais ações" }).click();
  await card.getByRole("button", { name: "Mudar horário" }).click();
  const folha = page.getByRole("dialog", { name: "Mudar horário" });
  await expect(folha).toBeVisible();
  return { card, folha };
}

async function salvar(page: Page, hora: string) {
  const { card, folha } = await abrirFolha(page, "2026-11", /^1 de novembro/);
  await folha.getByLabel("Hora").fill(hora);
  await folha.getByRole("button", { name: "Salvar" }).click();
  await expect(folha).toBeHidden();
  await expect(card).toContainText(`· ${hora}`);
}

test("folha de mudar horario", async ({ page }) => {
  const { folha } = await abrirFolha(page, "2026-11", /^1 de novembro/);
  await expect(folha.getByLabel("Hora")).toHaveValue("18:00");
  await expect(folha.getByRole("radio", { name: "Só esta data" })).toBeChecked();
  await expect(folha.getByRole("radio", { name: "Esta e as próximas" })).not.toBeChecked();
  await expect(folha.getByRole("button", { name: "Salvar" })).toBeVisible();
});

test("salvar mostra horario novo", async ({ page }) => {
  await salvar(page, "19:30");
  // Volta ao horario do seed: as telas seguintes comparam com 18:00.
  await salvar(page, "18:00");
});

test("erro mantem a folha", async ({ page }) => {
  const { folha } = await abrirFolha(page, "2026-10", /^4 de outubro/);
  await folha.getByRole("button", { name: "Salvar" }).click();
  await expect(folha.getByRole("alert")).toHaveText("Essa data já passou.");
  await expect(folha).toBeVisible();
});

test("aviso no editar", async ({ page }) => {
  const card = await abrirData(page, "2026-11", /^1 de novembro/);
  await card.getByRole("button", { name: "Mais ações" }).click();
  await card.getByRole("link", { name: "Editar" }).click();
  await expect(page.getByText("Muda também as datas já criadas a partir de hoje.")).toBeVisible();
});
