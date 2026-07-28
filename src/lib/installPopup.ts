import type { InstallOS } from "./platform";

// "Agora nao" adia por 14 dias em vez de esconder pra sempre.
export const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
export const SNOOZE_KEY = "install-popup-snooze";
export const DONE_KEY = "install-popup-done";

export function shouldShowInstallPopup(input: {
  standalone: boolean;
  done: boolean;
  snoozedAt: number | null;
  now: number;
  canPrompt: boolean;
  os: InstallOS;
}): boolean {
  if (input.standalone || input.done) return false;
  if (input.snoozedAt !== null && input.now - input.snoozedAt < SNOOZE_MS) return false;
  // No iOS nunca existe prompt nativo: o popup e o proprio guia manual.
  if (input.os === "ios") return true;
  return input.canPrompt;
}
