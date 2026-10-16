# Análise de acoplamento — 2026-10-16

Skill: `coupling-analysis` (modelo Khononov: força × distância × volatilidade).
Escopo: `src/modules/*` e `app/` (camada de rotas/actions).

```
MÓDULOS: 8 (identity, ministries, scheduling, availability, notifications, reports, repertoire, announcements)
DEPENDÊNCIAS MAPEADAS: 14 arestas entre módulos
CRÍTICOS: 0   MODERADOS: 4   BAIXOS: 2
SAÚDE GERAL: Atenção
```

## Volatilidade (commits em 6 meses, `src/modules`)

| Módulo | Commits | Subdomínio |
|---|---|---|
| scheduling | 101 | Core (alta) |
| identity | 20 | Genérico/suporte (média, por ser hub de authz) |
| ministries | 14 | Suporte |
| reports | 13 | Suporte (read model) |
| repertoire, notifications | 7 | Suporte |
| availability, announcements | 4 | Suporte (baixa) |

## Mapa de dependências (imports)

```
scheduling   --> identity(15) availability(6) notifications(4) ministries(2) reports(2)
repertoire   --> scheduling(3) identity(2) ministries(2)
ministries   --> identity(6)
announcements--> identity(2) notifications(1)
identity     --> notifications(2) scheduling(1)   <-- ciclo
availability, notifications, reports --> (nenhum)
```

## Acesso direto a tabelas de outro módulo (força: intrusiva)

| Módulo | Tabelas próprias | Tabelas alheias tocadas via Prisma |
|---|---|---|
| scheduling | schedule, occurrence, slot, allocation, swapRequest, scheduleRole | **membership (8), ministry (2), role (1)** |
| ministries | ministry, role, userSkill | **membership (5), slot (1)** |
| identity | user, membership | **ministry (1)** |
| reports | — (read model) | allocation, slot, occurrence, membership, ministry, user |
| `app/` (13 arquivos) | — | prisma direto em páginas, actions e rotas |

## Problemas

### C-01 — Ciclo identity ↔ scheduling (moderado)
- `src/modules/identity/services/reviewMembership.ts:3` importa `ledMinistryIds` de `scheduling/services/listMonthOccurrences.ts:91`.
- Também fecha o ciclo identity → scheduling → ministries → identity.
- Viola a regra "sem ciclos" da constituição.
- `ledMinistryIds` e `visibleMinistryIds` respondem "que ministérios este usuário lidera/vê". É regra de membership, ou seja, de identity, não de escalas.
- **Recomendação:** mover as duas para `identity/services/memberships.ts`. scheduling passa a importá-las de identity, e o ciclo some.

### C-02 — Regra "líder ativo" duplicada em 7 lugares (funcional simétrico, moderado)
O filtro `{ role: "LEADER", status: "ACTIVE" }` é reescrito à mão em:
`identity/services/authz.ts:60,75`, `identity/services/requestMembership.ts:40`, `scheduling/services/listMonthOccurrences.ts:96`, `scheduling/services/respondAllocation.ts:49`, `scheduling/services/swap.ts:213`, `app/(app)/solicitacoes/page.tsx:17`.
Se a regra mudar (ex.: co-líder, membership suspensa), são 7 pontos a sincronizar, em 3 camadas.
- **Recomendação:** expor em identity `leaderIdsOf(ministryId)` e `ledMinistryIds(userId)`, e substituir os 7 usos.

### C-03 — scheduling lê `membership` direto (intrusivo × core volátil, moderado)
8 consultas de `prisma.membership` em scheduling (e mais em `app/(app)/escalas/actions.ts:312`). O módulo de maior volatilidade conhece o schema interno de identity. Hoje estão no mesmo processo (distância baixa), então o custo é aceitável. Se identity mudar o modelo de membership, o impacto cai em scheduling.
- **Recomendação:** consolidar em funções de identity (`activeMemberIds`, que já existe, `activeMembersWithUser(ministryId)`, `isActiveMember(userId, ministryId)`). Isso também resolve o S-04 do relatório de segurança, porque a validação do alvo ganha um lugar óbvio.

### C-04 — `app/` acessa Prisma direto (moderado)
13 arquivos de rota/página/action importam `@/lib/prisma`. O pior caso é `getOccurrenceCandidatesAction` (`app/(app)/escalas/actions.ts:293-349`), com ~50 linhas de regra de negócio e 4 consultas na action. Isso quebra o fluxo padrão do CLAUDE.md (action → serviço) e deixa a regra fora do alcance de teste unitário.
- **Recomendação:** extrair para `scheduling/services/getOccurrenceCandidates.ts`. Nas páginas, as leituras simples podem ficar até virarem dor.

### C-05 — ministries toca `slot`; identity toca `ministry` (baixo)
- `ministries/services/removeRole.ts:20` checa `prisma.slot` para saber se a função está em uso.
- `identity/services/requestMembership.ts:24` lê `prisma.ministry`.
- Ambos são de baixa volatilidade. **Recomendação:** `scheduling.isRoleInUse(roleId)` e `ministries.getMinistry(id)` quando mexer nesses arquivos.

### C-06 — reports como read model transversal (baixo, aceitável)
reports lê 6 tabelas de 3 módulos. Para um módulo de relatório, isso é um *read model* legítimo, mas fere a letra da constituição. **Recomendação:** registrar a exceção na constituição (reports = leitura somente, sem escrita) em vez de refatorar.

## Pontos positivos
- availability, notifications e reports são folhas, sem dependências de saída.
- notifications é consumido só via `notifyUser` / `notifyIfPublished`, como um contrato estreito (bom contract coupling).
- `domain/` puro e testado em scheduling (recurrence, suggest, candidateList).
- Corrida de vaga resolvida no banco (`slotId @unique` + P2002), sem lock distribuído.

## Prioridade
1. **Alta:** C-01 (ciclo, viola a constituição; move de 2 funções).
2. **Média:** C-02 + C-03 juntos (API de membership em identity), depois C-04.
3. **Baixa:** C-05, C-06 (documentar).
