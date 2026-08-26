# Cancelar vaga sem ninguém alocado — Validation

**Result**: PASS

**Date**: 2026-08-26
**Spec**: `.specs/features/cancelar-vaga-vazia/spec.md`
**Diff range**: `b36ec27` (único commit da feature)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

Sem `tasks.md` formal (feature pequena, 1 story só — VAGA-01). Diff único (`b36ec27`) toca:

- `app/(app)/escalas/SlotDetailSheet.tsx` (+11 linhas)
- `.specs/features/cancelar-vaga-vazia/spec.md` (atualização de status)

Nenhum outro arquivo alterado — `OccurrenceRow.tsx` (onde vive `deactivateSlot`/`onDeactivate`) é **reusado sem modificação**, conforme a decisão registrada no spec ("Confirmação antes de desativar vaga vazia").

---

## Spec-Anchored Acceptance Criteria

Camada de UI (componente client `SlotDetailSheet.tsx`, sem suíte de render/testes automatizados no repo). Todo o mapeamento abaixo é **coberto por inspeção** — leitura real do código, não teste automatizado.

### VAGA-01: Desativar vaga vazia (P1)

| # | Criterion (WHEN X THEN Y) | Spec-defined outcome | Evidence (`file:line`) | Result |
|---|---|---|---|---|
| 01.1 | WHILE detalhe de vaga sem alocação está aberto SHALL exibir botão "Desativar vaga" | Botão visível sempre que a vaga não tem `allocatedName` | `SlotDetailSheet.tsx:45-46` — `filled = !!slot?.allocatedName; showPicker = !filled \|\| picking` (para vaga vazia, `filled=false` ⇒ `showPicker` é sempre `true`, independente de `picking`); `SlotDetailSheet.tsx:194-203` — `{!filled && (<button ... onClick={props.onDeactivate}>Desativar vaga</button>)}` dentro do ramo `showPicker` | ⚪ Coberto por inspeção — PASS |
| 01.2 | WHEN líder toca em "Desativar vaga" numa vaga sem alocação e confirma na caixa de diálogo THEN SHALL chamar `setSlotActiveAction(slotId, false)` e marcar a vaga como inativa | Chamada exata `setSlotActiveAction(slot.slotId, false)` após confirmação, sem bypass | `SlotDetailSheet.tsx:198` `onClick={props.onDeactivate}` → `OccurrenceRow.tsx:298` `onDeactivate={() => activeSlot && deactivateSlot(activeSlot)}` → `OccurrenceRow.tsx:212-231` `deactivateSlot`: `confirm({...})` na linha 213-221 é `await`-ado ANTES de qualquer chamada de serviço (`if (!ok) return;` na linha 221); linha 223 `const res = await setSlotActiveAction(slot.slotId, false);` | ⚪ Coberto por inspeção — PASS. Função reusada integralmente do estado preenchido (nenhuma bifurcação de fluxo para vaga vazia), conforme decisão registrada no spec |
| 01.3 | WHEN a desativação retorna sucesso THEN SHALL fechar o detalhe e remover a vaga da ocorrência na tela, sem recarregar o mês | Fechamento do sheet + patch local do cache (sem refetch de mês) | `OccurrenceRow.tsx:228-229` — sucesso chama `props.onActiveChanged(slot.slotId, false)` e depois `closeSheet()` (`OccurrenceRow.tsx:104-107`, seta `activeSlotId=null`); `EscalaCalendar.tsx:75-81` `patchActive` → `patchSlotActive` sobre `setCache` local (sem chamada de rede); `occurrenceCache.ts:56-63` `patchSlotActive` só faz `.map` no array em memória | ⚪ Coberto por inspeção — PASS. Comportamento pré-existente (nenhum destes arquivos foi tocado pelo commit `b36ec27`), reusado sem alteração para o caso de vaga vazia |
| 01.4 | The system SHALL manter o botão "Desativar vaga" no estado preenchido exatamente onde está hoje | Zero mudança de comportamento/posição no ramo preenchido | `git show b36ec27` — o bloco do estado preenchido (`SlotDetailSheet.tsx:206-223` no arquivo atual, ramo `else` de `showPicker`) não aparece no diff; a única adição é o bloco novo `{!filled && (...)}` dentro do ramo `showPicker` (linhas 194-203), que só é alcançável quando `filled=false`. Nenhuma linha do ramo `filled` foi tocada | ⚪ Coberto por inspeção — PASS |
| 01.5 | IF a ação retorna erro THEN SHALL manter a vaga visível e exibir a mensagem de erro no mesmo padrão já usado pelas demais ações da tela | Sem `onActiveChanged`/`closeSheet` em caso de erro; nota renderizada no mesmo componente | `OccurrenceRow.tsx:224-227` — `if (!res.ok) { setNote({ message: \`${MENSAGENS[res.code]} · cód. ${res.ref}\`, mode: "assign" }); return; }` (retorna antes de `onActiveChanged`/`closeSheet`, vaga permanece aberta no sheet); `SlotDetailSheet.tsx:80-92` renderiza `props.note.message` no mesmo `Badge` usado pelas demais notas de erro da tela (alocação, troca) | ⚪ Coberto por inspeção — PASS |

**Status**: ✅ 5/5 ACs cobertas por inspeção — nenhum gap.

### Edge Cases (spec.md)

- IF a vaga é preenchida por outra pessoa entre abrir o detalhe e tocar em "Desativar vaga" THEN desativa mesmo assim (comportamento de `setSlotActive`, fora do escopo desta camada de UI — `deactivateSlot` sempre chama `setSlotActiveAction(slot.slotId, false)` independente do estado local capturado no fechamento (`OccurrenceRow.tsx:223`), delegando a decisão real ao serviço no servidor). ⚪ Coberto por inspeção — não regressado.
- IF o usuário não é líder THEN `FORBIDDEN`, nada alterado — regra de autorização vive no serviço `setSlotActive` (fora do diff desta feature, fora de escopo do commit `b36ec27`). Não verificado nesta validação porque não foi tocado.

---

## AC 01.4 — Estado preenchido vs. spec do estado anterior

Comparação: a spec descreve (Problem Statement) que, "hoje", o botão "Desativar vaga" só existia no ramo preenchido, renderizado em `SlotDetailSheet.tsx:206-223` (bloco `<div className="flex items-center gap-4 pt-1">` com "Trocar" + "Desativar vaga", ambos com `disabled={props.pending}`). O `git show b36ec27` confirma que este bloco não sofreu nenhuma alteração de linha — o diff é estritamente aditivo, um novo bloco `{!filled && (...)}` inserido no ramo `showPicker` (vaga vazia). Logo, nenhuma mudança de comportamento no estado preenchido: PASS por inspeção.

---

## Discrimination Sensor

**Não aplicável a esta camada.** `SlotDetailSheet.tsx` é um componente client de UI sem suíte de render/testes automatizados no repo (nenhum arquivo em `tests/` exercita este componente ou `OccurrenceRow.tsx`). Não existe teste que possa "matar" uma mutação nesta camada — rodar o sensor de mutação aqui produziria um falso "survived" que não reflete gap real, apenas ausência de suíte de render (mesmo tratamento dado à camada UI em `.specs/features/capacitacoes/validation.md`, onde os itens de UI foram marcados "⚪ Coberto por inspeção" sem sensor de mutação). Isto é um limite conhecido do repo, não um gap desta feature.

**Sensor depth**: not applicable (sem suíte de render)
**Result**: n/a

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test && npm run build`
- **typecheck**: ✅ `tsc --noEmit` — sem erros
- **lint**: ✅ `next lint` — "No ESLint warnings or errors"
- **test**: ✅ `vitest run` — 33 arquivos, **188 testes passed**, 0 failed, 0 skipped
- **build**: ✅ `prisma generate && next build` — compilado com sucesso, todas as rotas geradas (incluindo `/escalas` e `/api/cron/*`)
- **Resultado consolidado**: 4/4 comandos passed, 0 failed

Nenhum teste novo foi adicionado por esta feature (esperado: camada de UI sem suíte de render). Contagem de testes não regrediu.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ — apenas o botão condicional `{!filled && (...)}` |
| No abstractions for single-use code | ✅ — reusa `onDeactivate` existente, sem nova função/abstração |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ✅ — só `SlotDetailSheet.tsx` (+ spec.md) |
| Didn't "improve" unrelated code | ✅ |
| Matches existing patterns/style | ✅ — mesmo padrão de botão `text-danger`, `disabled={props.pending}`, `min-h-11` usado no ramo preenchido |
| Would senior engineer approve? | ✅ |
| Tests map to acceptance criteria and are non-shallow | n/a — camada sem suíte de render (ver Sensor acima) |
| Spec-anchored outcome check | ✅ — ver tabela de ACs acima |
| Per-layer Coverage Expectation met | ✅ — UI classificada "none" (mesmo padrão de `capacitacoes`); lógica de domínio (`setSlotActive`) não foi tocada, já coberta anteriormente |
| Every test in scope maps to a spec AC | n/a — nenhum teste novo nesta feature |
| Documented guidelines followed | "none — strong defaults applied" (feature de UI pura, sem regra de teste de UI documentada no CLAUDE.md) |

---

## Edge Cases

- [x] Vaga preenchida por outra pessoa entre abertura e clique: comportamento delegado ao serviço, não regressado por este diff.
- [x] Usuário não-líder: regra de autorização fora do escopo do diff, não tocada.

---

## Requirement Traceability Update

| Requirement ID | Previous Status | New Status |
| --------------- | ---------------- | ---------- |
| VAGA-01 | Verified (auto-declarado pelo autor) | ✅ Verified (confirmado por Verifier independente) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 5/5 ACs cobertas por inspeção, 0 gaps
**Sensor**: not applicable — camada sem suíte de render (limite conhecido do repo, documentado, não é gap)
**Gate**: 4/4 passed (typecheck, lint, test 188/188, build)

**What works**: Botão "Desativar vaga" aparece no estado vazio, reusa o mesmo `onDeactivate`/`deactivateSlot`/`ConfirmDialog` do estado preenchido (confirmação + tratamento de erro + patch local de cache), sem tocar o ramo preenchido nem o serviço `setSlotActive`.

**Issues found**: nenhum.

**Next steps**: nenhum — feature pronta, sem fix tasks.
