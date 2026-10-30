import { test as base, expect } from "@playwright/test";

export const NOW = "2026-10-15T15:00:00.000Z";

// Mesmas chaves que o app le; sem elas o popup de instalar cobre a home.
export const test = base.extend<{ theme: "light" | "dark" }>({
  theme: ["light", { option: true }],
  page: async ({ page, theme }, use) => {
    await page.clock.setFixedTime(new Date(NOW));
    await page.addInitScript((t) => {
      localStorage.setItem("theme", t);
      localStorage.setItem("install-popup-done", "1");
      // Selo do Next em dev: cobre a nav e entra nas imagens.
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = "nextjs-portal { display: none !important; }";
        document.head.append(style);
      });
    }, theme);
    await use(page);
  },
});

export { expect };
