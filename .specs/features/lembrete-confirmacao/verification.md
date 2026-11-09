# Lembrete de confirmação verification

**Verdict**: FAIL
**Mutations**: 3 - probed C7, C12, C9
**Proofs**: `proofs.md` at f331fbf
**Verifier**: independent sub-agent (author != verifier)

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| Data em rascunho oferece "Lembrar pendentes" no menu e nenhum teste falha (AC 2); a regra do cliente em `OccurrenceRow.tsx` recompõe `canRemindOccurrence` sem teste próprio | mutation `published: props.published -> published: true` não morta (`OccurrenceRow.tsx:315`, proof C7) | incluir uma data em rascunho do Louvor com pendente no seed e no e2e "menu sem pendentes", ou extrair a montagem de `remindTargets` para função pura testada com rascunho | |
| O limite de 1 hora pode ler o lembrete manual mais antigo em vez do último e nenhum teste falha: `lastNotificationAt` só existe mockado | mutation `orderBy createdAt desc -> asc` em `notify.ts` não morta (proof C12); `remindPending.test.ts` mocka `lastNotificationAt` | teste de `lastNotificationAt` com duas linhas `lembrete-manual:a1:` (uma de 3 h, outra de 10 min) que espera a de 10 min, e uma `reminder-vespera:` que não entra | |
| Modal da vaga mostra "Lembrar confirmação" para convidado, rascunho ou data passada e nenhum teste falha (AC 8); C9 só prova a vaga `CONFIRMED` | mutation `canRemindActive -> allocatedStatus === "PENDING"` não morta (`OccurrenceRow.tsx`, proof C9) | no e2e "lembrar uma pessoa", abrir vaga de convidado `PENDING` e vaga `PENDING` de data passada e esperar o botão ausente | |
| "Lembrar pendentes" com o conjunto vazio no servidor (alguém confirmou depois de a página carregar) devolve `ok: true` com tudo 0 e o card mostra um aviso vazio | exemplo próprio: `remindPending` com só alocação `CONFIRMED` e sem `allocationId` -> `{0,0,0}`; `remindSummary({0,0,0})` -> `""`; `OccurrenceRow.tsx:490` renderiza `<p>` vazio | lançar `NOT_REMINDABLE` (ou texto "Ninguém pendente para lembrar") quando não há alvo, e testar | |
| Falha de banco em `notifyUser` ("failed" fora da corrida) é contada como `recentes` e mostrada como "já lembrada na última hora", embora nada tenha saído | `remindPending.ts:73-74` trata `"failed"` igual a `"duplicate"`; C14 fixa esse comportamento | contar `"failed"` à parte (ou como erro) e só `"duplicate"` em `recentes` | |
| C1/AC 1 fixa N só com N = 1 na tela; a contagem "(N)" com N > 1 não é provada no menu | `lembrete.spec.ts` "lembrar pendentes da data" só tem Lia pendente | aceitável se a regra do cliente for extraída e testada (achado 1); senão, seed com 2 pendentes | |
