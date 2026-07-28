# Home por papel + carrossel, e navegação por mês em Gestão Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os itens 2 e 3 do spec de UX: (2) a tela Inicial ganha um bloco de resumo pra líder/admin e a lista "Depois" vira carrossel horizontal com peek+indicador; (3) a seção "Vagas sem ninguém" em Gestão ganha navegação `< Mês Ano >` em vez de empilhar todos os meses.

**Architecture:** Item 2 adiciona um componente client novo (`UpcomingCarousel.tsx`) consumido por `app/(app)/page.tsx` (Server Component, que também passa a calcular `pendingCount` pro bloco de líder/admin). Item 3 estende `openSlots` (serviço já existente) com um limite superior de data e ajusta `app/(app)/admin/page.tsx` pra ler o mês via `searchParams` e renderizar navegação `Link`-based, sem client state. Os dois itens não compartilham código; só compartilham este plano por conveniência de execução.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4 (tokens do tema), Prisma, `date-fns-tz` (`fromZonedTime`, já usado em `listMonthOccurrences.ts`).

## Global Constraints

- Toda UI em pt-BR (labels, mensagens) — sem exceção.
- Cores só via tokens do tema (`bg-surface`, `text-text-muted`, `text-primary`, `bg-accent-soft`…) — nunca cor crua do Tailwind.
- Mudança é puramente visual/estrutural sobre lógica já existente e testada (`getMySchedule`, `openSlots`, `authz.ts`) — sem teste unitário novo necessário, exceto se uma task introduzir lógica de domínio nova (nenhuma introduz — `openSlots` só ganha um filtro de data adicional ao já existente).
- `EscalaCalendar.tsx`/`OccurrenceRow.tsx`/o resto do módulo de escalas alterado no plano anterior (`docs/superpowers/plans/2026-07-28-alocacao-bottom-sheet.md`, já mergeado) não são tocados aqui.

---

### Task 1: `UpcomingCarousel` (carrossel da home)

**Files:**
- Create: `app/(app)/UpcomingCarousel.tsx`

**Interfaces:**
- Consumes: `AllocationActions` (`app/(app)/AllocationActions.tsx`, já existe); tipo `UpcomingItem` de `@/modules/scheduling/services/getMySchedule` (já existe); `fmtDate`/`fmtTime`/`dateKey` de `@/lib/time`.
- Produces: `UpcomingCarousel({ items, todayKey }: { items: UpcomingItem[]; todayKey: string })` — client component, named export. Renderiza scroll horizontal com `snap-x snap-mandatory`, cada cartão `w-[85%] shrink-0 snap-center` (deixa ~15% do próximo cartão visível na borda = peek), mais indicador de texto "`X de Y`" abaixo, atualizado via `onScroll`.

- [ ] **Step 1: Criar o componente**

```tsx
"use client";

import { useRef, useState } from "react";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { AllocationActions } from "./AllocationActions";
import { fmtDate, fmtTime, dateKey } from "@/lib/time";
import type { UpcomingItem } from "@/modules/scheduling/services/getMySchedule";

export function UpcomingCarousel({ items, todayKey }: { items: UpcomingItem[]; todayKey: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;
    const cardWidth = el.scrollWidth / items.length;
    const index = Math.round(el.scrollLeft / cardWidth);
    setActive(Math.min(items.length - 1, Math.max(0, index)));
  }

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((it) => (
          <div key={it.allocationId} className="w-[85%] shrink-0 snap-center">
            <Card className="flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-primary">{it.ministry}</p>
                  <p className="text-lg text-text">{it.role}</p>
                  <p className="text-sm text-text-muted">{fmtDate(it.date)}</p>
                </div>
                <p className="font-title text-2xl text-primary">{fmtTime(it.date)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
                <div>
                  {it.status === "PENDING" && (
                    <Badge tone="info" className="normal-case! tracking-normal!">
                      Aguardando confirmação
                    </Badge>
                  )}
                </div>
                <AllocationActions
                  allocationId={it.allocationId}
                  status={it.status}
                  isToday={dateKey(it.date) === todayKey}
                  checkedIn={!!it.checkedInAt}
                  hasSwapOpen={it.hasSwapOpen}
                />
              </div>
            </Card>
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <p className="text-center text-xs text-text-muted mt-2">
          {active + 1} de {items.length}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros novos (componente ainda não tem consumidor real — `app/(app)/page.tsx` é modificado só na Task 2).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/UpcomingCarousel.tsx"
git commit -m "feat(home): adiciona UpcomingCarousel (scroll horizontal com peek e indicador)"
```

---

### Task 2: Conectar carrossel + bloco de resumo pra líder/admin em `app/(app)/page.tsx`

**Files:**
- Modify: `app/(app)/page.tsx`

**Interfaces:**
- Consumes: `UpcomingCarousel` (Task 1); `isLeaderOfAny` e `getSessionUser`-equivalente já usado (`requireUser`) de `@/modules/identity/services/authz`; `ledMinistryIds` de `@/modules/scheduling/services/listMonthOccurrences`; `NavRow` de `@/ui/NavRow`; `Bell` de `lucide-react`.
- Produces: nenhuma interface nova exportada — só a página raiz.

- [ ] **Step 1: Reescrever o arquivo**

```tsx
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { requireUser, isLeaderOfAny } from "@/modules/identity/services/authz";
import { ledMinistryIds } from "@/modules/scheduling/services/listMonthOccurrences";
import { prisma } from "@/lib/prisma";
import { getMySchedule } from "@/modules/scheduling/services/getMySchedule";
import { Card } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { EmptyState } from "@/ui/EmptyState";
import { NavRow } from "@/ui/NavRow";
import { fmtDate, fmtTime, dateKey } from "@/lib/time";
import { AllocationActions } from "./AllocationActions";
import { UpcomingCarousel } from "./UpcomingCarousel";
import { InstallPopup } from "./InstallPopup";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();

  const activeMembership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });
  if (!activeMembership) redirect("/onboarding");

  const isLeader = await isLeaderOfAny(user.id);
  const showGestaoResumo = user.isAdmin || isLeader;

  const [items, pendingCount] = await Promise.all([
    getMySchedule(user.id),
    showGestaoResumo
      ? (async () => {
          const scopeIds = user.isAdmin ? undefined : await ledMinistryIds(user.id, false);
          return prisma.membership.count({
            where: { status: "PENDING", ...(scopeIds ? { ministryId: { in: scopeIds } } : {}) },
          });
        })()
      : Promise.resolve(0),
  ]);

  const todayKey = dateKey(new Date());

  return (
    <div>
      <InstallPopup />
      <header className="mb-6">
        <p className="text-sm text-text-muted">Olá,</p>
        <h1 className="text-3xl text-text">{user.name.split(" ")[0]}</h1>
      </header>

      {showGestaoResumo && (
        <Card className="mb-8">
          <NavRow
            href="/solicitacoes"
            label="Solicitações"
            subtitle={pendingCount > 0 ? `${pendingCount} pendente(s)` : "Nenhum pedido pendente"}
            Icon={Bell}
          />
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma escala próxima"
          subtitle="Quando você for escalado, aparece aqui."
        />
      ) : (
        <>
          <h2 className="eyebrow mb-3">Próxima escala</h2>
          <Card className="mb-8 flex flex-col bg-primary/5 ring-1 ring-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow text-primary">{items[0].ministry}</p>
                <p className="text-xl text-text">{items[0].role}</p>
                <p className="text-sm text-text-muted">{fmtDate(items[0].date)}</p>
              </div>
              <p className="font-title text-3xl text-primary">{fmtTime(items[0].date)}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
              <div>
                {items[0].status === "PENDING" && (
                  <Badge tone="info" className="normal-case! tracking-normal!">
                    Aguardando confirmação
                  </Badge>
                )}
              </div>
              <AllocationActions
                allocationId={items[0].allocationId}
                status={items[0].status}
                isToday={dateKey(items[0].date) === todayKey}
                checkedIn={!!items[0].checkedInAt}
                hasSwapOpen={items[0].hasSwapOpen}
              />
            </div>
          </Card>

          {items.length > 1 && (
            <>
              <h2 className="eyebrow mb-3">Depois</h2>
              <UpcomingCarousel items={items.slice(1)} todayKey={todayKey} />
            </>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Rodar suíte de testes existente**

Run: `npm run test`
Expected: PASS (nenhum teste cobre `app/(app)/page.tsx` diretamente; confirma que nada em `tests/unit` quebrou).

- [ ] **Step 4: Validar manualmente no dev server**

Run: `npm run dev`

1. Como voluntário comum (sem liderar ministério, não admin) com 1 escala futura: bloco de "Solicitações" não aparece; card "Próxima escala" aparece normal; sem carrossel (só 1 item).
2. Mesmo usuário com 3+ escalas futuras: "Depois" vira carrossel — arrastar horizontalmente mostra o próximo cartão espiando na borda direita; indicador "`X de Y`" embaixo atualiza ao arrastar.
3. Como líder de ministério (ou admin) com solicitação `PENDING`: bloco "Solicitações" aparece no topo com a contagem certa e leva pra `/solicitacoes` ao tocar.
4. Como líder/admin sem solicitação pendente: bloco aparece com "Nenhum pedido pendente".
5. Viewport mobile (~375px): carrossel não estoura a largura da tela, cartão não fica cortado incorretamente.

Expected: nenhum erro no console; mesmos dados/ações de antes (Confirmar/Não posso/Check-in/pedir troca) continuam funcionando dentro dos cartões do carrossel.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/page.tsx"
git commit -m "feat(home): bloco de resumo pra lider/admin e carrossel na lista Depois"
```

---

### Task 3: `openSlots` ganha limite superior de data

**Files:**
- Modify: `src/modules/reports/services/reports.ts:5-29`

**Interfaces:**
- Produces: `openSlots(from = new Date(), to?: Date, ministryIds?: string[])` — mesma forma de retorno de antes (`{ slotId, date, ministry, role }[]`), só o filtro de data ganha `lte: to` quando `to` é passado. **Assinatura muda de posição** (`ministryIds` era o 2º parâmetro, agora é o 3º) — a Task 4 atualiza o único call site real (`app/(app)/admin/page.tsx`); `scripts/local-integration.ts:82` chama `openSlots()` sem argumentos, então não quebra.

- [ ] **Step 1: Editar a função**

Em `src/modules/reports/services/reports.ts`, trocar:

```ts
export async function openSlots(from = new Date(), ministryIds?: string[]) {
  const slots = await prisma.slot.findMany({
    where: {
      allocation: null,
      active: true,
      occurrence: {
        status: "ACTIVE",
        date: { gte: from },
        ...(ministryIds ? { schedule: { ministryId: { in: ministryIds } } } : {}),
      },
    },
```

por:

```ts
export async function openSlots(from = new Date(), to?: Date, ministryIds?: string[]) {
  const slots = await prisma.slot.findMany({
    where: {
      allocation: null,
      active: true,
      occurrence: {
        status: "ACTIVE",
        date: { gte: from, ...(to ? { lte: to } : {}) },
        ...(ministryIds ? { schedule: { ministryId: { in: ministryIds } } } : {}),
      },
    },
```

O resto da função (`include`, `orderBy`, `take: 200`, `return slots.map(...)`) não muda.

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: falha esperada aqui até a Task 4 — `app/(app)/admin/page.tsx:29` chama `openSlots(now, scopeIds)`, que depois desta mudança passa `scopeIds` (um `string[] | undefined`) na posição de `to` (`Date | undefined`), o que é um erro de tipo. **Se o typecheck falhar exatamente nesse ponto, isso é esperado — a Task 4 corrige o call site.** Se falhar em qualquer outro lugar, é um problema real, pare e reporte.

- [ ] **Step 3: Rodar suíte de testes existente**

Run: `npm run test`
Expected: PASS — nenhum teste unitário cobre `openSlots` diretamente (confirmar buscando `openSlots` em `tests/unit/`; se algum teste existir e quebrar por causa da mudança de posição do parâmetro, ajustar a chamada nesse teste pra nova assinatura antes de continuar).

- [ ] **Step 4: Commit**

```bash
git add src/modules/reports/services/reports.ts
git commit -m "feat(gestao): openSlots aceita limite superior de data (to)"
```

---

### Task 4: Navegação por mês em "Vagas sem ninguém" (`app/(app)/admin/page.tsx`)

**Files:**
- Modify: `app/(app)/admin/page.tsx`

**Interfaces:**
- Consumes: `openSlots(from, to, ministryIds)` (Task 3, assinatura nova); `monthKey`/`monthLabel` de `@/lib/time` (já existem, já importados neste arquivo); `fromZonedTime` de `date-fns-tz` (mesmo padrão de `listMonthOccurrences.ts`).
- Produces: página recebe `searchParams: Promise<{ vagasMes?: string }>` (padrão App Router já usado em `app/(app)/escalas/page.tsx`).

- [ ] **Step 1: Editar o arquivo**

No topo de `app/(app)/admin/page.tsx`, adicionar imports e helpers (logo após os imports existentes, antes de `export const dynamic`):

```tsx
import { fromZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { APP_TZ } from "@/lib/time";
```

(mantendo os imports já existentes — `fmtDateTime, monthKey, monthLabel` de `@/lib/time` continuam).

Adicionar, antes de `export default async function AdminPage`:

```tsx
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthWindow(year: number, month: number): { from: Date; to: Date } {
  const from = fromZonedTime(`${year}-${pad(month)}-01T00:00:00`, APP_TZ);
  const [nextYear, nextMonth] = month === 12 ? [year + 1, 1] : [year, month + 1];
  const to = fromZonedTime(`${nextYear}-${pad(nextMonth)}-01T00:00:00`, APP_TZ);
  return { from, to };
}

function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const total = year * 12 + (month - 1) + delta;
  return [Math.floor(total / 12), (total % 12) + 1];
}
```

Trocar a assinatura da função de página de:

```tsx
export default async function AdminPage() {
  const user = await getSessionUser();
```

por:

```tsx
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ vagasMes?: string }>;
}) {
  const { vagasMes } = await searchParams;
  const user = await getSessionUser();
```

Logo abaixo, onde hoje existe:

```tsx
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 864e5);
  const [open, load, byMinistry, pendingCount, guests] = await Promise.all([
    openSlots(now, scopeIds),
```

trocar por:

```tsx
  const now = new Date();
  const nowKey = monthKey(now);
  const [defYear, defMonth] = nowKey.split("-").map(Number);
  const [vagasYear, vagasMonth] =
    vagasMes && /^\d{4}-\d{2}$/.test(vagasMes) ? vagasMes.split("-").map(Number) : [defYear, defMonth];
  const { from: vagasFrom, to: vagasTo } = monthWindow(vagasYear, vagasMonth);

  const in30 = new Date(now.getTime() + 30 * 864e5);
  const [open, load, byMinistry, pendingCount, guests] = await Promise.all([
    openSlots(vagasFrom, vagasTo, scopeIds),
```

(o resto do `Promise.all` — `loadByPerson`, `volunteersByMinistry`, `prisma.membership.count`, `listGuestAllocations` — não muda.)

Mais abaixo, onde hoje existe o agrupamento por mês:

```tsx
  const openByMonth = new Map<string, typeof open>();
  for (const s of open) {
    const key = monthKey(s.date);
    const list = openByMonth.get(key) ?? [];
    list.push(s);
    openByMonth.set(key, list);
  }
```

remover esse bloco inteiro — não é mais necessário, `open` já vem filtrado pra um único mês.

Por fim, trocar o JSX da seção "Vagas sem ninguém" de:

```tsx
      <h3 className="text-sm text-text-muted mb-2">Vagas sem ninguém ({open.length})</h3>
      {open.length === 0 ? (
        <EmptyState title="Tudo alocado 🎉" />
      ) : (
        <div className="mb-8">
          {[...openByMonth.entries()].map(([key, slots]) => (
            <div key={key} className="mb-4 last:mb-0">
              <p className="eyebrow text-text-muted mb-2">{monthLabel(slots[0].date)}</p>
              <ul className="flex flex-col gap-2">
                {slots.map((s) => (
                  <li key={s.slotId}>
                    <Card className="flex items-center justify-between py-3">
                      <div>
                        <p className="eyebrow text-primary">{s.ministry}</p>
                        <p className="text-text">{s.role}</p>
                      </div>
                      <span className="text-sm text-text-muted">{fmtDateTime(s.date)}</span>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
```

por:

```tsx
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm text-text-muted">Vagas sem ninguém ({open.length})</h3>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin?vagasMes=${(() => {
              const [py, pm] = shiftMonth(vagasYear, vagasMonth, -1);
              return `${py}-${pad(pm)}`;
            })()}`}
            className="text-text-muted hover:text-text"
          >
            <ChevronLeft size={16} />
          </Link>
          <p className="text-xs text-text-muted whitespace-nowrap">{monthLabel(vagasFrom)}</p>
          <Link
            href={`/admin?vagasMes=${(() => {
              const [ny, nm] = shiftMonth(vagasYear, vagasMonth, 1);
              return `${ny}-${pad(nm)}`;
            })()}`}
            className="text-text-muted hover:text-text"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
      {open.length === 0 ? (
        <div className="mb-8">
          <EmptyState title="Nenhuma vaga em aberto neste mês" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2 mb-8">
          {open.map((s) => (
            <li key={s.slotId}>
              <Card className="flex items-center justify-between py-3">
                <div>
                  <p className="eyebrow text-primary">{s.ministry}</p>
                  <p className="text-text">{s.role}</p>
                </div>
                <span className="text-sm text-text-muted">{fmtDateTime(s.date)}</span>
              </Card>
            </li>
          ))}
        </ul>
      )}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros (a falha esperada da Task 3 se resolve aqui, já que o call site de `openSlots` passa a receber `to` corretamente).

- [ ] **Step 3: Rodar suíte de testes existente**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 4: Validar manualmente no dev server**

Run: `npm run dev`, logado como admin (ou líder de ministério com vaga aberta):

1. Abrir `/admin` sem query string → seção "Vagas sem ninguém" mostra o mês atual (mesmo que vazio).
2. Tocar `>` → navega pra `/admin?vagasMes=<próximo mês>`, mostra as vagas daquele mês (ou `EmptyState` "Nenhuma vaga em aberto neste mês").
3. Tocar `<` repetidas vezes → volta meses corretamente, inclusive virando o ano (dezembro → janeiro do ano seguinte e vice-versa).
4. Confirmar que as outras seções da página ("Carga por pessoa", "Voluntários por ministério", os `NavRow` do topo) não mudam ao trocar de mês — é uma navegação de página inteira (Server Component), então tudo recarrega junto, mas os *dados* das outras seções continuam representando o estado atual (não dependem de `vagasMes`).
5. Contagem `({open.length})` no título bate com a quantidade de itens listados abaixo pro mês selecionado.

Expected: nenhum erro no console; navegação funciona só com `Link`, sem JavaScript de estado no cliente.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/admin/page.tsx"
git commit -m "feat(gestao): navegacao por mes em Vagas sem ninguem"
```

---

## Self-Review Notes

- **Cobertura do spec:** bloco de resumo pra líder/admin (só solicitações pendentes, conforme decidido no brainstorm) ✅ Task 2; carrossel com peek + indicador ✅ Task 1/2; navegação `< Mês Ano >` em Gestão, mês atual como default ✅ Task 4; `openSlots` ganha `to` ✅ Task 3.
- **Ordem das tasks importa:** Task 3 antes da Task 4 é intencional — o typecheck da Task 3 vai falhar no call site antigo até a Task 4 rodar; isso está documentado no Step 2 da Task 3 como esperado, não é um placeholder disfarçado.
- **Sem placeholders:** todo step tem código completo; nenhum "implementar depois" ou "similar à task N" sem o trecho real.
- **Consistência de tipos:** `UpcomingCarousel` usa exatamente o tipo `UpcomingItem` já exportado por `getMySchedule.ts`, sem redefinir campos.
