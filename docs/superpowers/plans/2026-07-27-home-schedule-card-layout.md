# Home Schedule Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar o card de escala da home (`app/(app)/page.tsx`) em duas linhas — info em cima, badge+ações numa faixa inferior separada por divisória — e trocar o badge de status "aguardando confirmação" pra caixa normal, resolvendo o aperto/desalinhamento reportado.

**Architecture:** Mudança puramente de apresentação (JSX + classes Tailwind) em dois arquivos client/server components existentes. Sem novo estado, sem nova lógica de domínio, sem mudança de props/contratos entre módulos.

**Tech Stack:** Next.js 15 App Router (Server Component em `page.tsx`), React 19, Tailwind v4 (tokens do tema em `app/globals.css`), componente `Badge`/`Card` em `src/ui/`.

## Global Constraints

- Interface 100% em pt-BR — nenhum texto novo em inglês.
- Cores só via tokens do tema (`bg-surface`, `text-text-muted`, `border-border`, `text-primary`…) — nunca cores cruas do Tailwind (constituição do projeto).
- Mobile-first, `max-w-md` — o card precisa continuar legível em tela estreita.
- Escopo travado: só `app/(app)/page.tsx` (cards "Próxima escala" e "Depois") e `app/(app)/AllocationActions.tsx`. Não tocar `OccurrenceRow.tsx`, o componente `Badge` compartilhado, nem qualquer outra tela.
- Sem teste automatizado novo — mudança é visual/estrutural. Verificação é manual via `npm run dev` (ver spec, seção "Testes").

---

### Task 1: Simplificar o wrapper interno do estado PENDING em `AllocationActions`

**Files:**
- Modify: `app/(app)/AllocationActions.tsx:41-63`

**Interfaces:**
- Consumes: nada novo — mesma prop `status`, `allocationId`, `pending`, `start`, `confirm`, `dialog` já existentes no arquivo.
- Produces: o bloco PENDING passa a renderizar como uma única linha (`flex items-center gap-2`) em vez de coluna (`flex flex-col items-end gap-1` envolvendo uma sub-linha `flex gap-2`). Isso é o que a Task 2 vai encaixar direto na "linha 2" do card, sem wrapper de coluna sobrando.

- [ ] **Step 1: Editar o bloco `if (props.status === "PENDING")`**

Trocar:

```tsx
  if (props.status === "PENDING") {
    return (
      <div className="flex flex-col items-end gap-1">
        {dialog}
        <div className="flex gap-2">
          <button
            className="text-xs text-danger disabled:opacity-40"
            disabled={pending}
            onClick={decline}
          >
            Não posso
          </button>
          <Button
            className="py-1.5 px-3 text-xs"
            disabled={pending}
            onClick={() => start(() => confirmAllocationAction(props.allocationId))}
          >
            Confirmar
          </Button>
        </div>
      </div>
    );
  }
```

Por:

```tsx
  if (props.status === "PENDING") {
    return (
      <div className="flex items-center gap-2">
        {dialog}
        <button
          className="text-xs text-danger disabled:opacity-40"
          disabled={pending}
          onClick={decline}
        >
          Não posso
        </button>
        <Button
          className="py-1.5 px-3 text-xs"
          disabled={pending}
          onClick={() => start(() => confirmAllocationAction(props.allocationId))}
        >
          Confirmar
        </Button>
      </div>
    );
  }
```

Os outros três retornos do componente (`checkedIn`, `isToday && !checkedIn`, e o bloco final de troca) ficam exatamente como estão — não fazem parte desta task.

- [ ] **Step 2: Rodar o typecheck**

Run: `npm run typecheck`
Expected: sem erros novos (o componente não mudou tipos, só JSX).

- [ ] **Step 3: Rodar o lint**

Run: `npm run lint`
Expected: sem warnings/erros novos no arquivo.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/AllocationActions.tsx
git commit -m "refactor: achata bloco PENDING de AllocationActions numa linha so"
```

---

### Task 2: Reestruturar os cards da home em duas linhas com badge normal-case

**Files:**
- Modify: `app/(app)/page.tsx:41-62` (card "Próxima escala")
- Modify: `app/(app)/page.tsx:70-92` (cards da lista "Depois")

**Interfaces:**
- Consumes: `AllocationActions` do jeito que ficou depois da Task 1 (bloco PENDING em linha única, sem wrapper de coluna) — os demais estados do componente (checagem, troca) continuam retornando um único elemento cada, o que já encaixa numa linha `justify-between`.
- Produces: nenhuma interface nova exposta a outros arquivos — `page.tsx` é folha da árvore de componentes desta feature.

- [ ] **Step 1: Editar o card "Próxima escala"**

Trocar o bloco (linhas 41-62 do arquivo atual):

```tsx
          <Card className="mb-8 flex items-center justify-between bg-primary/5 ring-1 ring-primary/20">
            <div>
              <p className="eyebrow text-primary">{items[0].ministry}</p>
              <p className="text-xl text-text">{items[0].role}</p>
              <p className="text-sm text-text-muted">{fmtDate(items[0].date)}</p>
              {items[0].status === "PENDING" && (
                <Badge tone="info" className="mt-1">
                  aguardando confirmação
                </Badge>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="font-title text-3xl text-primary">{fmtTime(items[0].date)}</p>
              <AllocationActions
                allocationId={items[0].allocationId}
                status={items[0].status}
                isToday={dateKey(items[0].date) === todayKey}
                checkedIn={!!items[0].checkedInAt}
                hasSwapOpen={items[0].hasSwapOpen}
              />
            </div>
          </Card>
```

Por:

```tsx
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
                  <Badge tone="info" className="normal-case tracking-normal">
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
```

- [ ] **Step 2: Editar os cards da lista "Depois"**

Trocar o bloco (linhas 70-92 do arquivo atual):

```tsx
                    <Card className="flex items-center justify-between">
                      <div>
                        <p className="eyebrow text-primary">{it.ministry}</p>
                        <p className="text-lg text-text">{it.role}</p>
                        <p className="text-sm text-text-muted">{fmtDate(it.date)}</p>
                        {it.status === "PENDING" && (
                          <Badge tone="info" className="mt-1">
                            aguardando confirmação
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="font-title text-2xl text-primary">{fmtTime(it.date)}</p>
                        <AllocationActions
                          allocationId={it.allocationId}
                          status={it.status}
                          isToday={dateKey(it.date) === todayKey}
                          checkedIn={!!it.checkedInAt}
                          hasSwapOpen={it.hasSwapOpen}
                        />
                      </div>
                    </Card>
```

Por:

```tsx
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
                            <Badge tone="info" className="normal-case tracking-normal">
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
```

- [ ] **Step 3: Rodar o typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Rodar o lint**

Run: `npm run lint`
Expected: sem erros/warnings novos.

- [ ] **Step 5: Verificação manual no dev server**

Run: `npm run dev`

No navegador, logado com um usuário que tenha ao menos uma alocação `PENDING` e, se possível, uma `CONFIRMED` (hoje e não-hoje), abrir `/` e conferir:
- Linha 1 do card mostra ministério/função/data à esquerda e hora grande à direita, como antes.
- Existe uma divisória fina (`border-t`) separando a linha 1 da linha 2.
- Linha 2: quando `PENDING`, o badge "Aguardando confirmação" aparece à esquerda em caixa normal (não all-caps) e os botões "Não posso"/"Confirmar" aparecem à direita, com espaço confortável entre eles e em relação à hora acima.
- Quando não há badge (aloc. `CONFIRMED`, não hoje, sem troca aberta), a linha 2 mostra só as ações à direita, sem espaço quebrado à esquerda.
- Card "Depois" (se houver mais de uma escala) segue o mesmo padrão em escala menor (`text-lg`/`text-2xl`).

Se algum estado parecer errado, ajustar o CSS antes de prosseguir — não commitar com o layout quebrado.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "fix: reestrutura card de escala da home em duas linhas e normaliza caixa do badge"
```

---

## Self-Review Notes

- Cobertura da spec: layout de duas linhas (Task 2), divisória (Task 2), badge normal-case só nas duas instâncias da home (Task 2), simplificação do wrapper de `AllocationActions` (Task 1). Escopo travado a `page.tsx` + `AllocationActions.tsx` — `OccurrenceRow.tsx` e o componente `Badge` compartilhado não são tocados, conforme "Fora de escopo" da spec.
- Sem placeholders — todo trecho de código é o diff completo, não resumo.
- Consistência de nomes: `AllocationActions` mantém as mesmas props (`allocationId`, `status`, `isToday`, `checkedIn`, `hasSwapOpen`) antes e depois — nenhuma assinatura muda entre as tasks.
