# Capacitações por pessoa — Design

**Spec**: `.specs/features/capacitacoes/spec.md`

## Decisões de arquitetura

| Decisão | Escolha | Motivo |
| ------- | ------- | ------ |
| Módulo dono | `ministries` | A capacitação é sobre `Role`, que pertence a `Ministry`. `scheduling` e as páginas consomem via função de serviço, sem tocar a tabela — regra de modularidade da constituição. |
| Nome do modelo | `UserSkill` | Modelos do schema são em inglês (`Membership`, `Slot`); o termo de domínio "capacitação" fica nos comentários e na UI. |
| Unicidade | `@@unique([userId, roleId])` | AC CAPA-01.5. Toggle rápido usa `upsert`/`deleteMany`, então repetição converge sem P2002. |
| Cascade | `onDelete: Cascade` em `user` e `role` | Espelha `Membership`; cobre os edge cases de exclusão de pessoa e de ministério (que já cascateia em `Role`). |
| Membership inativa | Linha preservada, filtrada na leitura | Assumption da spec: readmissão restaura o histórico. |
| Lógica pura extraída | `decideSetSkill` e `groupVagasByCapability` | Convenção do repo: a regra testável sai como função pura (igual `decideAllocate`, `buildCandidateList`, `patchSlotActive`); o serviço com Prisma fica fino. |

## Modelo de dados

```prisma
// Capacitacao: a pessoa sabe executar esta funcao. Independe de estar escalada.
model UserSkill {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  roleId    String   @db.Uuid
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
  @@index([roleId])
}
```

Contra-relações novas: `User.skills UserSkill[]` e `Role.userSkills UserSkill[]`.

## Componentes

### `src/modules/ministries/domain/capabilities.ts` (puro)

```ts
export function decideSetSkill(params: {
  hasActiveMembership: boolean;
  roleActive: boolean;
}): "OK" | "FORBIDDEN" | "ROLE_INACTIVE";
```

Cobre CAPA-01.4 (sem membership ACTIVE → `FORBIDDEN`) e a assumption de `Role.active`.

### `src/modules/ministries/services/userSkills.ts`

- `setOwnSkill({ roleId, enabled })` — `requireUser`, resolve membership ACTIVE do ministério da função, aplica `decideSetSkill`, `upsert`/`deleteMany`.
- `setMemberSkill({ userId, roleId, enabled })` — `requireLeaderOf(role.ministryId)` (admin passa direto, já embutido em `isLeaderOf`), confirma que o alvo tem membership ACTIVE naquele ministério, aplica a mesma decisão.
- `listOwnSkillOptions(userId)` — funções ativas dos ministérios com membership ACTIVE + flag `capaz`, para a seção do `/perfil`.
- `listMinistrySkillMatrix(ministryId)` — membros ACTIVE (deduplicados por `userId`, cobre o edge case de dupla membership) × funções ativas + flags, para `/admin/ministerios`.
- `capableRoleIds(userId)` — `Set<string>` consumido por `/vagas`.
- `capableUserIdsForRole(roleId)` — `Set<string>` consumido pela lista de candidatos.

### `src/modules/scheduling/domain/groupVagas.ts` (puro)

```ts
export function groupVagasByCapability<T extends { roleId: string }>(
  items: T[],
  capableRoleIds: Set<string>,
): { praVoce: T[]; outras: T[] };
```

Preserva a ordem de entrada dentro de cada grupo (CAPA-04.5 — a página já ordena por data antes de agrupar).

### Alterações em código existente

- `src/modules/scheduling/services/candidateList.ts` — `buildCandidateList` ganha `capableUserIds: Set<string>`; `AllocationCandidate` ganha `capable: boolean`; ordenação passa a ser capacitado primeiro, depois carga 30d (CAPA-05.1 e .4).
- `app/(app)/vagas/page.tsx` — carrega `capableRoleIds`, adiciona `roleId` aos itens, agrupa e renderiza dois cabeçalhos condicionais.
- `app/(app)/escalas/SlotDetailSheet.tsx` — selo "não capacitado" ao lado do nome, mesmo padrão do selo "Indisponível" já existente; o botão continua clicável (CAPA-05.3).
- `app/(app)/perfil/page.tsx` + novo `SkillsSection.tsx` — seção "Minhas funções".
- `app/(app)/admin/ministerios/MinistryCard.tsx` + novo `MemberSkillsRow.tsx` — matriz de membro × função.

## Fluxo

```
/perfil        → listOwnSkillOptions → SkillsSection → setOwnSkillAction → setOwnSkill
/admin/minist. → listMinistrySkillMatrix → MemberSkillsRow → setMemberSkillAction → setMemberSkill
/vagas         → capableRoleIds → groupVagasByCapability → duas seções
detalhe vaga   → capableUserIdsForRole → buildCandidateList → ordena + selo
```

## Addendum — correção do design original de T13 (CAPA-05)

**Gap descoberto na execução**: o design original assumia que `SlotDetailSheet` chamaria `capableUserIdsForRole` por vaga. Na prática, `getOccurrenceCandidatesAction` busca os candidatos **uma vez por ocorrência** (comentário em `actions.ts`: "Uma busca so por ocorrencia... evita repetir 5 queries a cada seletor aberto") e reusa a mesma lista para todas as vagas daquela ocorrência — inclusive vagas de `Role` diferentes (uma ocorrência tem `Slot`s de várias funções, `@@unique([occurrenceId, roleId])`). Aplicar `capableUserIds` de uma função só nesse cache misturaria capacitação entre funções diferentes.

**Correção**: mover o cálculo de "capacitado nesta função" pra fora do fetch único por ocorrência, mantendo a mesma economia de rede:

1. `getOccurrenceCandidatesAction` passa a retornar também `capableUserIdsByRole: Record<string, string[]>` — um `capableUserIdsForRole` por `roleId` distinto entre os slots da ocorrência (poucos por ocorrência, sem custo relevante), calculado na mesma chamada que já busca candidatos.
2. `candidateList.ts` ganha `markCapable(candidates, capableUserIds)`, pura, que reaplica a mesma ordenação de `buildCandidateList` (extraída para um comparator comum) a uma lista de candidatos já calculada, sem recalcular carga nem indisponibilidade.
3. `roleId` passa a existir em `Slot` (client), propagado por `listMonthOccurrences` e `occurrenceCache.ts` — hoje só o nome (`role: string`) chega ao client.
4. `OccurrenceRow.tsx` computa, a cada troca de `activeSlot`, `markCapable(candidates, new Set(capableUserIdsByRole[activeSlot.roleId] ?? []))` antes de passar pro `SlotDetailSheet` — um fetch por ocorrência, uma reordenação (em memória, sem rede) por vaga aberta.

Nenhuma AC de CAPA-05 muda; só o mecanismo de entrega passa a respeitar o cache por ocorrência já existente.

## Riscos

- `listMinistrySkillMatrix` cresce em O(membros × funções). Ministérios da igreja têm dezenas de membros, não milhares — uma query de `UserSkill` por ministério e agrupamento em memória basta.
- A ordenação de candidatos muda o topo da lista que o líder já conhece. É o efeito desejado (CAPA-05.1), mas vale conferir com um ministério real após o deploy.
