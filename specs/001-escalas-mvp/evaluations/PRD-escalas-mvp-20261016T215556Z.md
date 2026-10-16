# Avaliação — PRD 001-escalas-mvp (inteira)

**Fonte de verdade**: `specs/001-escalas-mvp/spec.md` (input do usuário em `spec.md:9`; ACs `:23-88`; FRs `:109-152`)
**AC baseline**: `evaluations/_ac-baseline.md` (congelado nesta rodada)
**Juiz**: Claude Opus 5.5. **Autor provável**: família Claude (mesmo fornecedor). Viés de autopreferência sinalizado: checks limítrofes foram para UNMET.
**Superfície**: MVP inteiro (`src/modules/*`, `app/(app)/*`, `app/api/cron/*`, `tests/unit/*`, `scripts/local-integration.ts`), commit `b536082`.
**k=3**: **não foi executado**. Rodei uma passada única, com checks binários e evidência. Limitação registrada.

## Checklist de implementação

| AC | I-check | Veredito | Evidência |
|---|---|---|---|
| 1.1 | I1 alocações futuras do usuário | MET | `src/modules/scheduling/services/getMySchedule.ts:19-34` |
| 1.1 | I2 ordem cronológica | MET | `getMySchedule.ts:49` |
| 1.1 | I3-I6 ministério/função/data/hora | MET ×4 | `app/(app)/page.tsx:130-134`, carrossel `UpcomingCarousel` |
| 1.2 | I1 estado vazio | MET | `app/(app)/page.tsx:119-123` |
| 1.3 | I1 janela 48h | MET | `app/api/cron/reminders/route.ts:20-37` |
| 1.3 | I2 estágio véspera/hoje | MET | `reminders/route.ts:44` |
| 1.3 | I3 envia push | MET | `reminders/route.ts:57-65` |
| 1.3 | I4 wiring cron | MET | `src/lib/cron.ts:3-8`, `reminders/route.ts:16`, `vercel.json:4` |
| 2.1 | I1 sem data fim | MET | `src/modules/scheduling/services/createSchedule.ts:13,30` |
| 2.1 | I2 gera pela RRULE em 90d | MET | `materializeOccurrences.ts:10-50`, `domain/recurrence.ts:25-40` |
| 2.1 | I3 disparo pós-criação | MET | `app/(app)/escalas/actions.ts:63` |
| 2.1 | I4 gate de líder | MET | `createSchedule.ts` (`requireLeaderOf`) |
| 2.2 | I1 cria alocação | MET | `allocateVolunteer.ts:69-77` |
| 2.2 | I2 aparece na agenda | MET | `getMySchedule.ts:23` (quando publicada) |
| 2.2 | I3 notifica atribuição | MET | `allocateVolunteer.ts:85-93` |
| 2.3 | I1 UI com 2 opções | MET | `app/(app)/escalas/OccurrenceRow.tsx:324-330,411-412` |
| 2.3 | I2 SINGLE | MET | `deleteSchedule.ts:16-21` |
| 2.3 | I3 FROM_HERE preserva passadas | MET | `deleteSchedule.ts:24-34` (`date >= occ.date`) |
| 2.4 | I1 detecta conflito | MET | `availability/services/checkConflict.ts:36` |
| 2.4 | I2 bloqueia e avisa | MET | `allocateVolunteer.ts:58-65`; `OccurrenceRow.tsx:131-132` |
| 2.4 | I3 override registrado | MET | `allocateVolunteer.ts:74` (`overrideUnavailability`) |
| 3.1 | I1 salva | MET | `availability/services/unavailability.ts:32`; `indisponibilidade/actions.ts:12` |
| 3.1 | I2 exibe | MET | `indisponibilidade/page.tsx:21,39` |
| 3.2 | I1 flag nos candidatos | MET | `escalas/actions.ts:322,337-342`; `domain/candidateList.ts:5` |
| 3.2 | I2 UI sinaliza | MET | `SlotDetailSheet.tsx:128`; `AllocatePicker.tsx:102` |
| 4.1 | I1 elegibilidade | MET | `selfAllocate.ts:39` |
| 4.1 | I2 cria alocação SELF | MET | `selfAllocate.ts:53-57` |
| 4.1 | I3 corrida → SlotTaken | MET | `selfAllocate.ts:64` + `slotId @unique` |
| 4.1 | I4 sai da lista livre | MET | `app/(app)/vagas/page.tsx:31-33` (`allocation: null`) |
| 4.2 | I1 pedido OPEN | MET | `swap.ts:72-77` |
| 4.2 | I2 no pool | MET | `vagas/page.tsx:48-50,105` |
| 4.2 | I3 claim reatribui no lugar | MET | `swap.ts:164,172` |
| 4.2 | I4 original mantém até claim | MET | `swap.ts:72-77` só toca `SwapRequest`, não a `Allocation` |

**I total: 36/36.** A implementação cobre 100% dos ACs pontuados.

## Checklist de testes

| AC | Nível | T-check | Veredito | Evidência / busca |
|---|---|---|---|---|
| 1.1 | unit | T1 filtro do usuário/futuras | MET | `tests/unit/getMySchedule.test.ts:11-23` |
| 1.1 | unit | T2 ordenação | UNMET | `getMySchedule.test.ts` tem 2 casos, nenhum com ≥2 itens fora de ordem |
| 1.1 | e2e | T3 home renderiza campos | UNMET | `npx playwright test --list` → "No tests found" |
| 1.2 | e2e | T1 estado vazio | UNMET | idem; sem teste de página |
| 1.3 | unit | T1 estágio | MET | `tests/unit/reminders.test.ts:7-37` |
| 1.3 | unit | T2 envio | MET | `tests/unit/notifyNeverThrows.test.ts:53` |
| 1.3 | integ | T3 rota → lembrete | UNMET | grep `cron/reminders` em tests: ausente |
| 2.1 | unit | T1 RRULE | MET | `tests/unit/recurrence.test.ts:11-35` |
| 2.1 | integ | T2 persistência + idempotência | MET | `scripts/local-integration.ts:63-68` (Postgres real) |
| 2.1 | unit | T3 sem data fim aceito | UNMET | `scheduleFormRotation.test.ts` só testa `rotationCycle` |
| 2.2 | integ | T1 alocação persistida | UNMET | `allocateDraft.test.ts:39-46` é mock-only (`toHaveBeenCalledWith`) |
| 2.2 | unit | T2 notificação | MET | `allocateDraft.test.ts:49-54` |
| 2.2 | e2e | T3 voluntário vê | UNMET | sem e2e |
| 2.3 | — | T1 SINGLE | UNMET | grep `deleteScheduleOccurrence\|FROM_HERE` em `tests/`: ausente |
| 2.3 | — | T2 FROM_HERE preserva passadas | UNMET | idem. **O CLAUDE.md afirma essa cobertura, que não existe** |
| 2.4 | unit+integ | T1 conflito | MET | `conflictsWith.test.ts:21-31`; `local-integration.ts:98-100` |
| 2.4 | unit | T2 bloqueio | MET | `allocateOutcome.test.ts:11` |
| 2.4 | — | T3 override registrado | UNMET | `allocateOutcome.test.ts:16` testa só a decisão, não o campo gravado |
| 3.1 | — | T1 salvar | UNMET | grep `addUnavailability` em tests: ausente |
| 3.1 | — | T2 exibir | UNMET | grep `listUnavailability` em tests: ausente |
| 3.2 | unit | T1 flag | MET | `candidateList.test.ts:41` |
| 3.2 | e2e | T2 UI | UNMET | sem e2e |
| 4.1 | unit | T1 elegibilidade | MET | `selfAllocateEligibility.test.ts:13-16` |
| 4.1 | integ | T2 alocação pelo serviço | UNMET | `selfAllocate` só testado no caminho rascunho (`allocateDraft.test.ts:60`) |
| 4.1 | integ | T3 unicidade | MET | `local-integration.ts:72-79` |
| 4.1 | — | T4 lista livre exclui | UNMET | `local-integration.ts:83` testa `openSlots` (admin), não a query de `/vagas` |
| 4.2 | unit | T1 pedido | MET | `swap.test.ts:30-41` |
| 4.2 | unit | T2 claim elegível | MET | `swap.test.ts:16-27` |
| 4.2 | integ | T3 reatribuição | UNMET | só máquina de estados pura; `claimSwap` sem teste de estado |

**T total: 13/29 = 0.45.**

## Elicitação E (spec vs pedido original em `spec.md:9`)

| # | Categoria | Veredito | Evidência |
|---|---|---|---|
| 1 | Validação de entrada | Missed | nenhum FR de limites/formatos |
| 2 | Taxonomia de erro | Missed | — |
| 3 | AuthN/AuthZ | Addressed | `spec.md:145-147` |
| 4 | Idempotência | Missed | materialização idempotente só no plan, não na spec |
| 5 | Concorrência | Addressed | `spec.md:96,119` |
| 6 | Ciclo de vida/consistência | Addressed | `spec.md:95,112` |
| 7 | Observabilidade | Missed | — |
| 8 | Limites | Addressed | `spec.md:99,182` (janela finita) |
| 9 | Falha de dependência externa | Addressed | `spec.md:98,134` (push negado) |
| 10 | Transições de estado | Addressed | `spec.md:101,163` |

**E_recall = 6/10 = 0.60**

| # | Adição além do pedido | Veredito | Construído? | Justificada? |
|---|---|---|---|---|
| A1 | Override registrado de indisponibilidade (FR-012) | Valid-necessary | sim | sim (`:94`) |
| A2 | Aviso na autoalocação em conflito (FR-013) | Valid-necessary | sim (`selfAllocate.ts:47-49`) | sim |
| A3 | Vaga única e corrida consistente (FR-008) | Valid-necessary | sim | sim (`:96`) |
| A4 | Papéis e escopo por ministério (FR-022/023) | Valid-necessary | sim | sim |
| A5 | Janela finita de materialização (FR-002) | Valid-defensive | sim (90d) | sim (`:99`) |
| A6 | Removido do ministério → vagas futuras em aberto (`:100`) | Valid-necessary | **não** | sim |
| A7 | Push negado não quebra a home (FR-017) | Valid-defensive | sim (`PushRegister.tsx:50-65`) | sim |

**E_precision = 7/7 = 1.00 · E_justified = 7/7 = 1.00**

## Escopo S
**S = partial (plan drift).** A6 está sancionado em `spec.md:100`, mas `removeMembership` (`src/modules/identity/services/setMembershipRole.ts:18-22`) só apaga a membership, e as alocações futuras continuam com a pessoa. Não há build fora de escopo. Os módulos posteriores (repertório, avisos, aniversariantes etc.) vêm de outras specs (`.specs/features/*`) e não contam como rogue para esta PRD.

## Gates G
| Gate | Comando | Resultado |
|---|---|---|
| build | `npm run build` | ✓ |
| lint | `npm run lint` | ✓ (aviso de deprecação) |
| unit | `npm run test` | ✓ 397/397, 64 arquivos |
| e2e | `npx playwright test --list` | not-run: "Error: No tests found / Total: 0 tests in 0 files" |
| integração | `npm run test:local` | **not-run de propósito**: `DATABASE_URL` aponta para `aws-1-sa-east-1.pooler.supabase.com` (produção) e o script começa com `TRUNCATE ... CASCADE` em todas as tabelas (`scripts/local-integration.ts:22-24`) |

Nenhum gate ✗, então não há Adjusted Final.

## Resultado

```
AC1.1 I=6/6 T=1/3 AC=0.73 | AC1.2 I=1/1 T=0/1 AC=0.60 | AC1.3 I=4/4 T=2/3 AC=0.87
US1 P1 w=3 Story=0.73
AC2.1 0.87 | AC2.2 0.73 | AC2.3 0.60 | AC2.4 0.87 → US2 P1 w=3 Story=0.77
AC3.1 0.60 | AC3.2 0.80 → US3 P2 w=2 Story=0.70
AC4.1 0.80 | AC4.2 0.87 → US4 P2 w=2 Story=0.83
Σw=10  Final=0.76  I_total=36/36  T_total=13/29=0.45
```
(saída de `node -e`, colada sem edição)

| Métrica | Valor |
|---|---|
| **Final** | **0.76 → Strong (minor gaps)** |
| E (recall / precision / justified) | 0.60 / 1.00 / 1.00 |
| S | partial |
| Harness (T sobre o conjunto sancionado) | 0.45 |
| G | build ✓ · lint ✓ · unit ✓ · e2e not-run · integração not-run |
| US5 (P3, informativo) | implementado: `reports.ts:8,35,133`; integração `local-integration.ts:83-85` |

**Veredito:** a implementação está completa (I = 1.00), mas o harness é fraco (T = 0.45). Toda a nota perdida vem de teste: zero e2e, exclusão com escopo sem teste e caminhos de persistência testados só com mock.

## Gaps e correções (ranqueados)
1. **Segurança operacional**: `test:local` apaga a produção se rodado com o `.env` atual. Exigir um `DATABASE_URL_TEST` separado e abortar se o host não for `localhost`.
2. **AC2.3**: testar `deleteScheduleOccurrence` SINGLE e FROM_HERE (passadas preservadas) no `local-integration.ts`. Corrigir o CLAUDE.md, que afirma essa cobertura.
3. **A6 (plan drift)**: em `removeMembership`, liberar as alocações futuras do ministério (e testar).
4. **e2e**: smoke de home (lista + vazio), alocação pelo líder e `/vagas` (autoalocação + troca).
5. **AC3.1**: teste de `addUnavailability` (validação) e `listUnavailability`.
6. **AC2.2/4.1/4.2 T-outcome**: estender `local-integration.ts` com `allocateVolunteer`, `selfAllocate` e `claimSwap` contra o banco real (exige stub de sessão).
7. **AC1.1 T2**: caso com 2 alocações fora de ordem em `getMySchedule.test.ts`.
8. **AC2.1 T3 / AC2.4 T3**: criar sem `recurrenceUntil`; asserir `overrideUnavailability: true` gravado.
