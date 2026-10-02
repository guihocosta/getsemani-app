import { notifyUser, wasNotified } from "@/modules/notifications/services/notify";
import type { AllocationStatus } from "@prisma/client";

// Ocorrencia em rascunho e silenciosa: o lider monta sem avisar ninguem e os
// escalados recebem o aviso de uma vez ao publicar (ver publishOccurrence.ts).
export async function notifyIfPublished(
  published: boolean,
  params: Parameters<typeof notifyUser>[0],
): Promise<Awaited<ReturnType<typeof notifyUser>> | "skipped"> {
  if (!published) return "skipped";
  return notifyUser(params);
}

// Aviso de remocao nao segue so o rascunho: quem ja sabia que estava escalado
// (confirmou, ou recebeu o aviso de escalacao antes da data virar rascunho)
// precisa saber que saiu. Quem foi colocado e tirado dentro do rascunho nunca
// soube de nada e continua sem aviso.
export async function notifyRemoval(
  published: boolean,
  removed: { id: string; status: AllocationStatus },
  params: Parameters<typeof notifyUser>[0],
): Promise<Awaited<ReturnType<typeof notifyUser>> | "skipped"> {
  if (!published && removed.status !== "CONFIRMED" && !(await wasNotified(`assign:${removed.id}`))) {
    return "skipped";
  }
  return notifyUser(params);
}
