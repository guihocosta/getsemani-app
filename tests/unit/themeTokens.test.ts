import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVOS = [
  "src/ui/AppShell.tsx",
  "src/ui/SwipeNav.tsx",
  "src/ui/BottomSheet.tsx",
  "src/ui/ConfirmDialog.tsx",
  "src/ui/Sheet.tsx",
  "src/ui/navItems.ts",
  "src/ui/useDialog.ts",
  "app/(app)/layout.tsx",
  "app/(app)/PendingConfirmationsCard.tsx",
  "app/(app)/TodayCheckInCard.tsx",
  "app/(app)/UpcomingCarousel.tsx",
  "app/(app)/escalas/EscalaCalendar.tsx",
  "app/(app)/escalas/panorama/page.tsx",
  "app/(app)/admin/page.tsx",
  "app/(app)/admin/visao-geral/page.tsx",
];

const COR_CRUA =
  /\b(?:bg|text|border|ring|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

describe("tema", () => {
  it.each(ARQUIVOS)("so tokens de cor em %s", (arquivo) => {
    expect(readFileSync(arquivo, "utf8")).not.toMatch(COR_CRUA);
  });
});
