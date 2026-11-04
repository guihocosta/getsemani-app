// Cor padrao dos formularios de ministerio (token `brand`).
export const DEFAULT_MINISTRY_COLOR = "#2a78cd";

const HEX6 = /^#[0-9a-fA-F]{6}$/;

// A cor vai para `style`: so `#rrggbb` passa, o resto vira a cor da marca.
export function ministryColor(color: string | null | undefined): string {
  return color && HEX6.test(color) ? color : DEFAULT_MINISTRY_COLOR;
}
