# Alinhamento de Notificações: Trocas e Lembretes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar notificações ao fluxo de trocas de escalas (quando uma vaga é disponibilizada e assumida) e estender a janela do cron de lembretes para 36 horas para rodar 1x ao dia.

**Architecture:** O serviço `swap.ts` será atualizado para chamar o método idempotente `notifyUser` para disparar Web Pushes após a conclusão de suas operações no banco de dados. O cron de lembretes será alterado diretamente em sua rota estática. 

**Tech Stack:** Next.js (App Router), Prisma, Web Push.

## Global Constraints

- O envio de pushes via `notifyUser` nunca deve rodar *dentro* de uma transação do Prisma (`prisma.$transaction`) para evitar segurar a conexão do banco durante I/O de rede. O `notifyUser` deve ser chamado sempre após o banco confirmar a gravação.
- A aplicação é construída com TypeScript; tipagens e imports devem ser estritos.

---

### Task 1: Update Reminder Cron Window

**Files:**
- Modify: `app/api/cron/reminders/route.ts:8-10`

**Interfaces:**
- Consumes: N/A
- Produces: Um cron configurado para varrer 36h no lugar de 24h.

- [ ] **Step 1: Modify the cron window constant**

Altere a constante `REMINDER_WINDOW_H` para `36` e atualize o comentário.

```typescript
const REMINDER_WINDOW_H = 36; // avisa escalas dentro das proximas 36h
```

- [ ] **Step 2: Commit**

```bash
git add app/api/cron/reminders/route.ts
git commit -m "fix(cron): expand reminder window to 36 hours for daily execution"
```

---

### Task 2: Implement Notifications for requestSwap

**Files:**
- Modify: `src/modules/scheduling/services/swap.ts:1-26`

**Interfaces:**
- Consumes: `notifyUser` from `@/modules/notifications/services/notify`, `fmtDateTime` from `@/lib/time`
- Produces: `requestSwap` envia push para membros e líderes ativos.

- [ ] **Step 1: Add imports**

No topo do arquivo `src/modules/scheduling/services/swap.ts`, adicione as importações do sistema de notificação.

```typescript
import { notifyUser } from "@/modules/notifications/services/notify";
import { fmtDateTime } from "@/lib/time";
```

- [ ] **Step 2: Include related entities in requestSwap**

Atualize o `include` do `findUniqueOrThrow` dentro de `requestSwap` para buscar os dados que comporão a mensagem:

```typescript
  const alloc = await prisma.allocation.findUniqueOrThrow({
    where: { id: params.allocationId },
    include: {
      swapRequest: true,
      user: true,
      slot: {
        include: { role: true, occurrence: { include: { schedule: { include: { ministry: true } } } } },
      },
    },
  });
```

- [ ] **Step 3: Modify requestSwap to notify users after creation**

Após a criação do `SwapRequest`, busque os membros ativos do ministério e dispare notificações em lote.

```typescript
  const swapRequest = await prisma.swapRequest.create({
    data: { allocationId: alloc.id, requestedBy: user.id, status: "OPEN" },
  });

  const ministryId = alloc.slot.occurrence.schedule.ministryId;
  const activeMembers = await prisma.membership.findMany({
    where: { ministryId, status: "ACTIVE" },
    select: { userId: true },
  });

  const recipients = activeMembers.map((m) => m.userId).filter((id) => id !== user.id);

  await Promise.all(
    recipients.map((recipientId) =>
      notifyUser({
        userId: recipientId,
        type: "SWAP",
        dedupeKey: `swap-request:${swapRequest.id}:${recipientId}`,
        title: "Vaga disponível para troca",
        body: `${alloc.user!.name} pediu troca em ${alloc.slot.occurrence.schedule.ministry.name} · ${alloc.slot.role.name} · ${fmtDateTime(alloc.slot.occurrence.date)}`,
        url: "/escalas",
        occurrenceId: alloc.slot.occurrenceId,
      })
    )
  );

  return swapRequest;
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/scheduling/services/swap.ts
git commit -m "feat(swap): notify ministry members when a swap is requested"
```

---

### Task 3: Implement Notifications for claimSwap

**Files:**
- Modify: `src/modules/scheduling/services/swap.ts:28-90`

**Interfaces:**
- Consumes: `notifyUser`, `fmtDateTime`
- Produces: `claimSwap` envia push para o voluntário original e para os líderes ao assumir a troca.

- [ ] **Step 1: Include user in claimSwap allocation query**

Atualize a query `findUniqueOrThrow` do `tx.swapRequest` dentro de `claimSwap` para incluir o relacionamento do usuário original, para podermos usar o nome dele na notificação.

```typescript
    const swap = await tx.swapRequest.findUniqueOrThrow({
      where: { id: params.swapRequestId },
      include: {
        allocation: {
          include: { 
            user: true,
            slot: { include: { role: true, occurrence: { include: { schedule: true } } } } 
          },
        },
      },
    });
```

- [ ] **Step 2: Extract data outside the transaction block**

Para não segurar a transação, vamos precisar dos dados da notificação. Em `claimSwap`, armazene as informações necessárias ANTES de retornar da função. Salve o retorno do `$transaction` em uma variável e execute o código de notificação após ele.

```typescript
export async function claimSwap(params: { swapRequestId: string }) {
  const user = await requireUser();

  const { updated, originalUserId, originalUserName, roleName, occurrenceDate, ministryId, occurrenceId, swapId } = await prisma.$transaction(async (tx) => {
    const swap = await tx.swapRequest.findUniqueOrThrow({
      where: { id: params.swapRequestId },
      include: {
        allocation: {
          include: { 
            user: true,
            slot: { include: { role: true, occurrence: { include: { schedule: true } } } } 
          },
        },
      },
    });
    if (swap.status !== "OPEN") throw new SlotTaken();
    if (swap.requestedBy === user.id) throw new NotOwner();

    const ministryId = swap.allocation.slot.occurrence.schedule.ministryId;
    if (!user.isAdmin) {
      const member = await tx.membership.findFirst({
        where: { userId: user.id, ministryId, status: "ACTIVE" },
      });
      if (!member) throw new Error("NOT_ELIGIBLE");
    }

    const updated = await tx.allocation.update({
      where: { id: swap.allocationId },
      data: {
        userId: user.id,
        source: "SWAP",
        overrideUnavailability: false,
        status: "CONFIRMED",
        respondedAt: new Date(),
        checkedInAt: null,
      },
    });
    await tx.swapRequest.update({
      where: { id: swap.id },
      data: { status: "CLAIMED", claimedBy: user.id, resolvedAt: new Date() },
    });
    
    return {
      updated,
      originalUserId: swap.requestedBy,
      originalUserName: swap.allocation.user!.name,
      roleName: swap.allocation.slot.role.name,
      occurrenceDate: swap.allocation.slot.occurrence.date,
      ministryId,
      occurrenceId: swap.allocation.slot.occurrenceId,
      swapId: swap.id
    };
  });

  // Notificação pós-transação

  await notifyUser({
    userId: originalUserId,
    type: "SWAP",
    dedupeKey: `swap-claimed-requester:${swapId}`,
    title: "Sua troca foi assumida!",
    body: `${user.name} assumiu sua escala de ${roleName} · ${fmtDateTime(occurrenceDate)}`,
    url: "/",
  });

  const leaders = await prisma.membership.findMany({
    where: { ministryId, status: "ACTIVE", role: "LEADER" },
    select: { userId: true }
  });

  await Promise.all(
    leaders.map(leader =>
      notifyUser({
        userId: leader.userId,
        type: "SWAP",
        dedupeKey: `swap-claimed-leader:${swapId}:${leader.userId}`,
        title: "Troca efetuada no ministério",
        body: `${user.name} assumiu a escala de ${originalUserName} · ${roleName} · ${fmtDateTime(occurrenceDate)}`,
        url: "/escalas",
        occurrenceId,
      })
    )
  );

  return updated;
}
```

- [ ] **Step 3: Run the unit tests to ensure everything still passes**

Execute os testes unitários do serviço `swap`. Como o mock do db foi feito via transações reais, tudo ainda deve estar funcional, mas é bom validar o fluxo.

```bash
npm run test -- tests/unit/swap.test.ts tests/unit/notifyNeverThrows.test.ts
```
Expected: PASS 

- [ ] **Step 4: Commit**

```bash
git add src/modules/scheduling/services/swap.ts
git commit -m "feat(swap): notify original user and leaders when a swap is claimed"
```
