import { PrismaClient, type AllocationStatus } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { assertLocal, type Stack } from "./stack";

export const PASSWORD = "e2e-senha-local";
export const PERSONAS = {
  lider: "lider@e2e.local",
  voluntario: "voluntario@e2e.local",
  confirmador: "confirmador@e2e.local",
  liderSemPendencia: "lider2@e2e.local",
  umCard: "umcard@e2e.local",
  varios: "varios@e2e.local",
} as const;
export type Persona = keyof typeof PERSONAS;

// 18:00 em America/Sao_Paulo (UTC-3 em outubro de 2026).
const at = (day: string) => new Date(`${day}T21:00:00.000Z`);

const NOMES = [
  "Maria Clara Andrade",
  "João Pedro Almeida",
  "Ana Beatriz Moreira",
  "Rafael Souza Lima",
  "Camila Ribeiro Dias",
  "Lucas Ferreira Gama",
];
const NOME_LONGO = "Maria Fernanda de Albuquerque Cavalcanti";

async function resetAuth(stack: Stack) {
  const admin = createClient(stack.apiUrl, stack.serviceKey, { auth: { persistSession: false } }).auth.admin;
  const { data } = await admin.listUsers({ perPage: 1000 });
  for (const u of data.users) {
    if (u.email?.endsWith("@e2e.local")) await admin.deleteUser(u.id);
  }
  const ids = {} as Record<Persona, string>;
  for (const [persona, email] of Object.entries(PERSONAS) as [Persona, string][]) {
    const { data: created, error } = await admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error) throw error;
    ids[persona] = created.user.id;
  }
  return ids;
}

export async function seed(stack: Stack) {
  assertLocal(stack.dbUrl);
  const ids = await resetAuth(stack);
  const prisma = new PrismaClient({ datasources: { db: { url: stack.dbUrl } } });

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(",")} RESTART IDENTITY CASCADE;`,
  );

  await prisma.user.createMany({
    data: [
      { id: ids.lider, name: "Lia Lider", email: PERSONAS.lider },
      { id: ids.voluntario, name: "Vera Voluntaria", email: PERSONAS.voluntario },
      { id: ids.confirmador, name: "Caio Confirmador", email: PERSONAS.confirmador },
      { id: ids.liderSemPendencia, name: "Lena Lider", email: PERSONAS.liderSemPendencia },
      { id: ids.umCard, name: "Uma Unica", email: PERSONAS.umCard },
      { id: ids.varios, name: "Vito Varios", email: PERSONAS.varios },
    ],
  });
  const pessoas = await Promise.all(
    [...NOMES, NOME_LONGO].map((name, i) =>
      prisma.user.create({
        data: { id: `00000000-0000-4000-8000-00000000000${i}`, name, email: `p${i}@e2e.local` },
      }),
    ),
  );

  // Id fixo: sem orderBy, a ordem das vagas na tela segue o roleId.
  let ministerios = 0;
  async function ministerio(name: string, repertoireEnabled: boolean, roles: string[], color?: string) {
    ministerios++;
    const m = await prisma.ministry.create({
      data: {
        name,
        color,
        repertoireEnabled,
        roles: {
          create: roles.map((r, i) => ({
            id: `10000000-0000-4000-8000-0000000000${ministerios}${i}`,
            name: r,
          })),
        },
      },
      include: { roles: true },
    });
    const schedule = await prisma.schedule.create({
      data: {
        ministryId: m.id,
        title: `Culto ${name}`,
        recurrenceRule: "FREQ=WEEKLY;BYDAY=SU",
        startDate: new Date("2026-10-04"),
        startTime: "18:00",
        createdBy: ids.lider,
      },
    });
    return { ...m, roles: [...m.roles].sort((a, b) => a.name.localeCompare(b.name)), scheduleId: schedule.id };
  }

  async function data(
    m: Awaited<ReturnType<typeof ministerio>>,
    day: string,
    alocados: (null | { userId: string; status?: AllocationStatus } | { guestName: string })[],
  ) {
    const occurrence = await prisma.occurrence.create({ data: { scheduleId: m.scheduleId, date: at(day) } });
    for (const [i, role] of m.roles.entries()) {
      const slot = await prisma.slot.create({ data: { occurrenceId: occurrence.id, roleId: role.id } });
      const a = alocados[i];
      if (a && "guestName" in a) {
        await prisma.allocation.create({ data: { slotId: slot.id, guestName: a.guestName, source: "LEADER" } });
      } else if (a) {
        await prisma.allocation.create({
          data: { slotId: slot.id, userId: a.userId, source: "LEADER", status: a.status ?? "CONFIRMED" },
        });
      }
    }
  }

  const louvor = await ministerio("Louvor", true, ["Bateria", "Teclado", "Violão", "Vocal"]);
  const midia = await ministerio("Mídia", false, ["Projeção", "Som"]);
  const recepcao = await ministerio("Recepção", false, ["Porta"]);
  const apoio = await ministerio("Apoio", false, ["Café", "Limpeza", "Portaria"]);
  // Cor salva: os cartoes de umCard mostram a borda nessa cor.
  const intercessao = await ministerio("Intercessão", false, ["Oração"], "#e0605a");
  const zeladoria = await ministerio("Zeladoria", false, ["Chaves", "Luzes", "Som"]);

  await prisma.membership.createMany({
    data: [
      { userId: ids.lider, ministryId: louvor.id, role: "LEADER" },
      { userId: ids.lider, ministryId: midia.id, role: "LEADER" },
      { userId: ids.voluntario, ministryId: recepcao.id, role: "VOLUNTEER" },
      { userId: ids.confirmador, ministryId: apoio.id, role: "VOLUNTEER" },
      { userId: ids.liderSemPendencia, ministryId: apoio.id, role: "LEADER" },
      { userId: ids.umCard, ministryId: intercessao.id, role: "VOLUNTEER" },
      { userId: ids.varios, ministryId: zeladoria.id, role: "VOLUNTEER" },
      { userId: pessoas[5].id, ministryId: midia.id, role: "VOLUNTEER", status: "PENDING" },
      ...pessoas.slice(0, 4).map((p) => ({ userId: p.id, ministryId: louvor.id, role: "VOLUNTEER" as const })),
    ],
  });

  // Louvor: 5 datas, com 2 check-ins hoje (15/10) e 3 pendencias da lider.
  const [p0, p1, p2, p3, p4, p5, longo] = pessoas.map((p) => p.id);
  await data(louvor, "2026-10-04", [{ userId: p0 }, { userId: p1 }, { userId: p2 }, { userId: p3 }]);
  await data(louvor, "2026-10-11", [{ userId: p4 }, { userId: p5 }, null, { userId: p0 }]);
  await data(louvor, "2026-10-15", [{ userId: ids.lider }, { userId: p1 }, null, { userId: ids.lider }]);
  await data(louvor, "2026-10-18", [{ userId: ids.lider, status: "PENDING" }, null, { userId: p2 }, { userId: p3 }]);
  await data(louvor, "2026-10-25", [{ userId: ids.lider, status: "PENDING" }, { userId: p4 }, { userId: p5 }, null]);
  // Teclado com pessoa sem conta: a pagina da data mostra "sem conta".
  await data(louvor, "2026-11-01", [{ userId: ids.lider, status: "PENDING" }, { guestName: "Zé Visitante" }, null, null]);
  // Proxima e Depois da lider, com repertorio: fora de outubro, para nao mexer no panorama.
  await data(louvor, "2026-11-08", [{ userId: ids.lider }, null, null, null]);
  await data(louvor, "2026-11-15", [{ userId: ids.lider }, null, null, null]);
  await prisma.announcement.create({
    data: { ministryId: louvor.id, authorId: ids.lider, title: "Ensaio sábado", body: "Às 16h.", pinned: true },
  });

  // Midia: 10 datas no mes e um nome longo, para a tabela precisar rolar.
  for (let dia = 1; dia <= 10; dia++) {
    const day = `2026-10-${String(dia).padStart(2, "0")}`;
    await data(midia, day, [{ userId: longo }, { userId: p0 }]);
  }

  for (const day of ["2026-10-18", "2026-10-25", "2026-11-01", "2026-11-08"]) {
    await data(recepcao, day, [{ userId: ids.voluntario }]);
  }
  await data(apoio, "2026-10-18", [
    { userId: ids.confirmador, status: "PENDING" },
    { userId: ids.confirmador, status: "PENDING" },
    { userId: ids.confirmador, status: "PENDING" },
  ]);

  // Um item em cada grupo da home: hoje, pendente, proxima e depois.
  await data(intercessao, "2026-10-15", [{ userId: ids.umCard }]);
  await data(intercessao, "2026-10-18", [{ userId: ids.umCard, status: "PENDING" }]);
  await data(intercessao, "2026-10-22", [{ userId: ids.umCard }]);
  await data(intercessao, "2026-10-29", [{ userId: ids.umCard }]);

  // Tamanhos que faltavam nos grupos: 3 hoje, 2 pendentes e 2 em Depois.
  const vito = { userId: ids.varios };
  await data(zeladoria, "2026-10-15", [vito, vito, vito]);
  await data(zeladoria, "2026-10-18", [{ ...vito, status: "PENDING" }]);
  await data(zeladoria, "2026-10-25", [{ ...vito, status: "PENDING" }]);
  await data(zeladoria, "2026-10-20", [vito]);
  await data(zeladoria, "2026-10-22", [vito]);
  await data(zeladoria, "2026-10-29", [vito]);

  await prisma.$disconnect();
}
