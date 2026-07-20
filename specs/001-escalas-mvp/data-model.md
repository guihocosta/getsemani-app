# Data Model: App de Escalas (MVP)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Modelagem relacional (Postgres/Prisma). Nomes de entidades mapeiam as Key Entities da spec. Tudo em UTC; exibição em America/Sao_Paulo.

## Entidades

### User (`identity`)
Perfil de domínio da pessoa. `id` = mesmo UUID de `auth.users.id` (Supabase Auth). Auth/credenciais ficam em `auth.users`; esta tabela guarda dados de domínio e papéis. Papel global derivado das associações; um usuário pode ser Voluntário em vários ministérios e Líder em alguns.
- `id` (UUID, FK lógica → `auth.users.id`), `name`, `email` (único), `phone?`, `avatarUrl?`
- `isAdmin` (boolean) — acesso global
- `createdAt`, `updatedAt`
- Relações: `memberships[]`, `allocations[]`, `unavailabilities[]`, `pushSubscriptions[]`

### Ministry (`identity`)
Ministério/unidade.
- `id`, `name`, `description?`, `color?`
- Relações: `roles[]`, `memberships[]`, `schedules[]`

### Membership (`identity`)
Associação usuário↔ministério com papel local.
- `id`, `userId`, `ministryId`
- `role`: enum `LEADER | VOLUNTEER`
- unique `(userId, ministryId, role)`
- FR-022/023 (líder restrito aos ministérios que lidera).

### Role (Função) (`scheduling`)
Papel dentro de um ministério (ex.: vocal, som, projeção).
- `id`, `ministryId`, `name`, `active`
- Relação: `slots[]`

### Schedule (Escala recorrente) (`scheduling`)
Definição recorrente. FR-001/002.
- `id`, `ministryId`, `title`
- `recurrenceRule` (string RRULE, ex.: `FREQ=WEEKLY;BYDAY=SU`)
- `startDate`, `startTime`, `durationMin`
- `recurrenceUntil?` (null = sem data fim; setado ao excluir "daqui em diante") — FR-003/004
- `createdBy`, timestamps
- Relação: `occurrences[]`, `defaultRoles[]` (funções esperadas por ocorrência)

### Occurrence (Ocorrência) (`scheduling`)
Instância materializada por cron dentro da janela futura. FR-002/005.
- `id`, `scheduleId`, `date` (data/hora concreta), `status`: enum `ACTIVE | CANCELLED`
- `cancelledScope?`: enum `SINGLE | FROM_HERE` (auditoria da exclusão)
- unique `(scheduleId, date)` (idempotência da materialização)
- Relação: `slots[]`

### Slot (Vaga) (`scheduling`)
Uma função a preencher em uma ocorrência. A "escala livre" = slot sem allocation.
- `id`, `occurrenceId`, `roleId`
- unique `(occurrenceId, roleId)`
- Relação: `allocation?` (0..1)

### Allocation (Alocação) (`scheduling`)
Voluntário ocupando um slot. FR-006/007/008.
- `id`, `slotId` (**unique** — garante 1 pessoa por vaga, resolve corrida FR-008), `userId`
- `source`: enum `LEADER | SELF | SWAP`
- `overrideUnavailability` (boolean) — registrado quando líder força sobre indisponibilidade (FR-012)
- `createdAt`
- Relação: `swapRequest?`

### SwapRequest (Pedido de Troca) (`scheduling`)
Pedido que libera a vaga como pool aberto. FR-009/010/024.
- `id`, `allocationId`, `requestedBy`
- `status`: enum `OPEN | CLAIMED | CANCELLED`
- `claimedBy?`, `resolvedAt?`
- Fluxo: OPEN → slot vira "livre" no pool mantendo allocation original até alguém elegível aceitar (CLAIMED = nova allocation criada, antiga removida em transação).

### Unavailability (Indisponibilidade) (`availability`)
Restrição mensal do voluntário. FR-011/012/013.
- `id`, `userId`, `year`, `month`
- `date?` (dia específico) + `startTime?`/`endTime?` (faixa horária) — dia inteiro se horários null
- unique lógico por `(userId, date, startTime)`

### PushSubscription (`notifications`)
Endpoint Web Push por dispositivo. FR-014.
- `id`, `userId`, `endpoint` (único), `p256dh`, `auth`, `createdAt`

### Notification (`notifications`)
Registro/idempotência de envios. FR-014/015/016.
- `id`, `userId`, `type`: enum `ASSIGNMENT | REMINDER | SWAP`
- `occurrenceId?`, `sentAt?`, `dedupeKey` (único) — evita reenvio (D7)

## Diagrama de relações (texto)

```
Ministry 1─* Role
Ministry 1─* Membership *─1 User
Ministry 1─* Schedule 1─* Occurrence 1─* Slot 0..1─ Allocation 1─ User
Role     1─* Slot
Allocation 0..1─ SwapRequest
User 1─* Unavailability
User 1─* PushSubscription
User 1─* Notification
```

## Regras de negócio (invariantes)

1. **1 pessoa por vaga**: `Allocation.slotId` unique (FR-008).
2. **Sem data fim**: `Schedule.recurrenceUntil` null → cron materializa continuamente dentro da janela (D5).
3. **Exclusão**: SINGLE cancela a occurrence; FROM_HERE seta `recurrenceUntil` e cancela occurrences futuras não passadas; passadas preservadas (FR-003/004).
4. **Indisponibilidade**: bloqueia alocação por padrão; líder pode `overrideUnavailability=true` (registrado); auto-alocação em conflito é avisada (FR-012/013).
5. **Troca = pool**: SwapRequest OPEN expõe slot como livre; aceite cria nova Allocation e fecha a request em transação (FR-024).
6. **Relatórios** derivam de agregações sobre Allocation/Occurrence/Membership — sem tabelas de agregação no MVP (FR-020/021).

## Índices sugeridos

- `Occurrence(date)` e `Occurrence(scheduleId, date)` — tela inicial e materialização.
- `Slot(occurrenceId)`; parcial "sem allocation" para vagas em aberto (painel Admin FR-019).
- `Allocation(userId, createdAt)` — relatório de carga (FR-020).
- `Membership(ministryId, role)` — relatório de voluntários por ministério (FR-021).
- `Unavailability(userId, year, month)`.
