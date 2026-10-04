# Visão geral verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 9a58a2c..e2b2015
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

Escopo: os 7 checks de `checks.md` (C1..C7), provas rodadas em `4e1756f` (HEAD de `feat/backlog-louveapp`). Nenhum arquivo da feature mudou entre `e2b2015` e HEAD (`git diff --stat e2b2015..HEAD` vazio para os arquivos do diff). Perfil `light`, o mesmo de `checks.md`: sem injeção de falhas, sem recomputar `Coverage`, sem passo de fontes vinculantes. Passo 5 (percorrer o fluxo com o usuário) não se aplica: o verificador não alcança o usuário.

## Checks

Uma única chamada vitest sobre os arquivos de prova das duas features verificadas nesta rodada: `npm run test -- tests/unit/panorama.test.ts tests/unit/parseMonthParam.test.ts tests/unit/listMonthOccurrences.test.ts tests/unit/overview.test.ts tests/unit/overviewData.test.ts --reporter=verbose`, exit 0, 5 arquivos, 21 testes passaram, 0 falharam. Cada teste nomeado abaixo aparece individualmente na saída como executado e aprovado. Cada padrão `-t` de `checks.md` casa com um nome de teste existente. Os dois arquivos de teste da feature nasceram dentro do diff range. As provas `grep` rodaram exatamente como escritas e `npm run typecheck` (`tsc --noEmit`) saiu com 0.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | com agora `2026-10-02T15:00Z`, janelas de `7d`, `30d`, `90d` e `mes` nos instantes UTC do claim | vitest em lote, `overviewPeriod > janelas de 7, 30 e 90 dias terminam no fim de hoje; mes e o mes corrente` passou | `tests/unit/overview.test.ts:10` - `expect([iso(d7.from), iso(d7.to)]).toEqual(["2026-09-26T03:00:00.000Z", "2026-10-03T03:00:00.000Z"])`; `:13` - `toEqual(["2026-09-03T03:00:00.000Z", "2026-10-03T03:00:00.000Z"])`; `:16` - `toEqual(["2026-07-05T03:00:00.000Z", "2026-10-03T03:00:00.000Z"])`; `:19` - `toEqual(["2026-10-01T03:00:00.000Z", "2026-11-01T03:00:00.000Z"])` | PASS |
| C2 | `overviewPeriod(undefined)` e `overviewPeriod("xyz")` devolvem `key = "30d"` | vitest em lote, `periodo padrao e 30d para chave ausente ou desconhecida` passou | `tests/unit/overview.test.ts:23` - `expect(overviewPeriod(undefined, NOW).key).toBe("30d")`; `:24` - `expect(overviewPeriod("xyz", NOW).key).toBe("30d")` | PASS |
| C3 | `summarizeOverview` devolve `escalas 2`, `escalacoes 4`, `vagasAbertas 1`, `membrosEscalados 3`, `pctMembros 60`, `pctConfirmadas 67`, `pctFaltas 50` | vitest em lote, `summarizeOverview calcula totais e percentuais` passou | `tests/unit/overview.test.ts:51` - `expect(s).toEqual({ escalas: 2, escalacoes: 4, vagasAbertas: 1, membrosEscalados: 3, membrosAtivos: 5, pctMembros: 60, pctConfirmadas: 67, pctFaltas: 50 })` (entrada em `:40-48`: 3 com conta, 1 convidado, 2 `CONFIRMED`, 2 com conta em dia encerrado, 1 sem check-in) | PASS |
| C4 | sem alocações e sem membros os três percentuais são `null`; `fmtPct(null) = "—"`, `fmtPct(67) = "67%"` | vitest em lote, `denominador zero vira percentual nulo e travessao na tela` passou | `tests/unit/overview.test.ts:65` - `expect(s.pctMembros).toBeNull()`; `:66` - `expect(s.pctConfirmadas).toBeNull()`; `:67` - `expect(s.pctFaltas).toBeNull()`; `:69` - `expect(fmtPct(null)).toBe("—")`; `:70` - `expect(fmtPct(67)).toBe("67%")` | PASS |
| C5 | `overviewData` consulta ocorrências, vagas e alocações com `ACTIVE`, `published: true`, janela e `ministryIds`; membros `ACTIVE` distintos; marca `ended` para data anterior a hoje | vitest em lote, `overviewData filtra ativa, publicada, janela e ministerios, e marca dia encerrado` e `overviewData sem ministryIds nao escopa por ministerio` passaram | `tests/unit/overviewData.test.ts:44` - `expect(prisma.occurrence.count).toHaveBeenCalledWith({ where: occurrence })` (`occurrence` literal em `:38-43`); `:45` - `expect(prisma.slot.count).toHaveBeenCalledWith({ where: { active: true, allocation: null, occurrence } })`; `:46` - `expect(prisma.allocation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { slot: { occurrence } } }))`; `:49` - `expect(prisma.membership.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "ACTIVE", ministryId: { in: ["m1"] } }, distinct: ["userId"] }))`; `:56` - `expect(data).toEqual({ ... allocations: [{ ... ended: true }, { ... ended: false }] })` | PASS |
| C6 | página redireciona para `/` quem não é admin nem líder e passa `scopeIds` a `overviewData` | `grep -q 'if (!user.isAdmin && !isLeader) redirect("/");' ... && grep -q "overviewData(from, to, startOfDay(now), scopeIds)" ... && grep -q "user.isAdmin ? undefined : await ledMinistryIds(user.id, false)" ... && npm run typecheck` exit 0 | `app/(app)/admin/visao-geral/page.tsx:23` - `if (!user.isAdmin && !isLeader) redirect("/");`; `:26` - `const scopeIds = user.isAdmin ? undefined : await ledMinistryIds(user.id, false);`; `:30` - `overviewData(from, to, startOfDay(now), scopeIds)` | PASS |
| C7 | `/admin` linka "Visão geral" para `/admin/visao-geral` | `grep -q 'href="/admin/visao-geral"' "app/(app)/admin/page.tsx"` exit 0 | `app/(app)/admin/page.tsx:108` - `href="/admin/visao-geral"`; `:109` - `label="Visão geral"` | PASS |

## Level and sampling

Nenhum item abaixo derruba o veredito: em todos o código foi lido e está correto em `4e1756f`. Ficam registrados porque a prova não pegaria uma regressão.

- **C6 (level)**: o claim é um redirecionamento e um recorte de autorização, e a prova é `grep` do texto do gate mais `typecheck`. Nenhum teste executa a página como voluntário, líder ou admin. Declarado em `checks.md` (o repo não tem teste de componente). Conferido por leitura: o gate em `app/(app)/admin/visao-geral/page.tsx:19-26` roda antes de qualquer consulta e é o mesmo de `app/(app)/admin/page.tsx`.
- **C5 (level)**: Prisma mockado; a prova é sobre o formato do `where`, que é o que o claim afirma. `occurrence.count` e `slot.count` são comparados por igualdade exata; `allocation.findMany` e `membership.findMany` por `objectContaining` com o `where` inteiro, então um filtro a mais ou a menos no `where` falharia.
- **C5 (sampling)**: `ended` é amostrado com uma data de dias atrás e uma de hoje à noite. O limite exato (ocorrência à meia-noite local de hoje, `date == startOfToday`) não está na amostra; o código usa `<` (`src/modules/reports/services/reports.ts:127`), que é o correto.
- **C4 (sampling)**: os três denominadores são zerados no mesmo caso. Não há caso com alocações com conta e nenhuma em dia encerrado (`pctFaltas` nulo com `pctConfirmadas` numérico). O código trata os três de forma independente pela mesma `pct` (`src/modules/reports/domain/overview.ts:45-47`).
- **AC 4, tela**: que a página usa `fmtPct` nos três cartões só é conferido por leitura (`page.tsx:39`, `:41`, `:44`).

## Swept rows resolving to existing

| Row | Cited constraint | Found |
| --- | --- | --- |
| failure modes | `app/(app)/error.tsx` cobre falha de leitura | sim - `app/(app)/error.tsx:6` exporta `AppError`, boundary do grupo `(app)`, que contém `admin/visao-geral/page.tsx`; `app/(app)/loading.tsx` também existe |

## Adversarial read

Lido o diff inteiro além dos checks. Nenhum achado bloqueante.

- **Autorização**: quem não é admin nem líder ativo sai em `page.tsx:23` antes de qualquer leitura (`isLeaderOfAny` exige `LEADER` e `ACTIVE`, `src/modules/identity/services/authz.ts:73-78`). Líder recebe `scopeIds = ledMinistryIds(user.id, false)`, só `LEADER` `ACTIVE`; a página não aceita id de ministério por parâmetro, só `periodo`. Lista vazia continua escopando (`ministryIds ?` é verdadeiro para `[]`, `reports.ts:97` e `:113`), então nunca cai no ramo global do admin.
- **Rascunho (AD-006)**: as três leituras de ocorrência, vaga e alocação compartilham o mesmo objeto com `published: true` (`reports.ts:93-98`, usado em `:101`, `:102`, `:104`). Nenhuma contagem inclui rascunho.
- **Janelas**: `overviewPeriod` parte de `startOfDay` em APP_TZ (`overview.ts:23-28`); `mes` usa `monthKey` e `monthWindow` (`:20-21`). Os valores do teste foram refeitos à mão: 02/10 12:00 local, início do dia `03:00Z`, menos 6, 29 e 89 dias.
- **Percentuais**: convidado sem conta entra só em `escalacoes` (`overview.ts:52`, `:58`); faltas só sobre alocação com conta em dia encerrado (`:53`, `:64`); `ended` vem de `date < startOfToday` com `startOfDay(now)` passado pela página (`reports.ts:127`, `page.tsx:30`).
- **UI**: só tokens de tema, textos em pt-BR, grade de 2 colunas que cabe em 360px.

Observações menores, não bloqueantes:

1. **Percentual de membros pode passar de 100%** - `src/modules/reports/domain/overview.ts:54` e `:62`: o numerador conta toda pessoa com conta alocada na janela, o denominador só quem tem `Membership` `ACTIVE` hoje (`reports.ts:112-116`). Quem foi escalado e depois saiu do ministério entra em cima e não embaixo, e o cartão pode mostrar algo como "6/5". É o que o AC 3 define; fica como ponto de produto.
2. **Fronteira de módulo** - `src/modules/reports/services/reports.ts:100-117`: `reports` lê `Occurrence`, `Slot`, `Allocation` e `Membership` direto pelo Prisma, tabelas de `scheduling` e `ministries`. Mesmo formato das funções já existentes no arquivo (`openSlots`, `loadByPerson`, `attendanceRows`) e descrito no plano; não é desvio novo, mas estende o acesso cruzado que a constituição veda.
3. **Aritmética de 24h** - `overview.ts:26-27`: a janela subtrai múltiplos de `864e5`. Correto em `America/Sao_Paulo` (sem horário de verão); com `APP_TIMEZONE` de fuso com horário de verão o início da janela sairia uma hora fora na virada.
4. **Texto do cartão** - `page.tsx:41`: "das escalações" para Confirmações, mas o denominador exclui convidado sem conta. A nota de rodapé (`:85`) esclarece.

## Gate

`npm run test -- tests/unit/panorama.test.ts tests/unit/parseMonthParam.test.ts tests/unit/listMonthOccurrences.test.ts tests/unit/overview.test.ts tests/unit/overviewData.test.ts --reporter=verbose` - 21 passed, 0 failed

`npm run typecheck` exit 0. Provas `grep` de C6 e C7 exit 0. Árvore de trabalho igual ao baseline, exceto os relatórios de verificação.
