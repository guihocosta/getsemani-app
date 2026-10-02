import { notifyUser } from "@/modules/notifications/services/notify";

// Ocorrencia em rascunho e silenciosa: o lider monta sem avisar ninguem e os
// escalados recebem o aviso de uma vez ao publicar (ver publishOccurrence.ts).
export async function notifyIfPublished(
  published: boolean,
  params: Parameters<typeof notifyUser>[0],
): Promise<Awaited<ReturnType<typeof notifyUser>> | "skipped"> {
  if (!published) return "skipped";
  return notifyUser(params);
}
