import { prisma } from "@/lib/prisma";

// O que outro modulo precisa saber de uma ocorrencia para decidir acesso:
// de qual ministerio e, e se ja esta no ar. Sem checagem de permissao aqui.
export async function getOccurrenceAccess(occurrenceId: string) {
  const occurrence = await prisma.occurrence.findUniqueOrThrow({
    where: { id: occurrenceId },
    include: { schedule: { include: { ministry: true } } },
  });
  return {
    occurrenceId: occurrence.id,
    ministryId: occurrence.schedule.ministryId,
    published: occurrence.published,
    date: occurrence.date,
    title: `${occurrence.schedule.ministry.name} · ${occurrence.schedule.title}`,
  };
}
