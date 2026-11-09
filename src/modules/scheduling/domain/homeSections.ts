import { dateKey } from "@/lib/time";
import type { AllocationStatus } from "@prisma/client";

type Item = { status: AllocationStatus; date: Date };

// Grupos da tela inicial: pendente pede resposta, hoje pede check-in, futura
// so informa. "Nenhuma escala proxima" so aparece sem nada nos tres.
export function homeSections<T extends Item>(items: T[], todayKey: string) {
  const pending = items.filter((it) => it.status === "PENDING");
  const confirmed = items.filter((it) => it.status !== "PENDING");
  const today = confirmed.filter((it) => dateKey(it.date) === todayKey);
  const future = confirmed.filter((it) => dateKey(it.date) !== todayKey);
  return { pending, today, future, showEmpty: pending.length + today.length + future.length === 0 };
}
