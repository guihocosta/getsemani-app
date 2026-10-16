# AC baseline (congelado) — 001-escalas-mvp

Congelado em 2026-10-16. Toda avaliação futura desta PRD usa exatamente estes checks. Não re-dividir nem fundir.

**Prioridade (ASSUMED):** a spec usa P1/P2/P3. Mapeamento para os pesos da skill: P1→3 (core MVP), P2→2, P3→0 (fora da nota; roadmap readiness).

**Política de nível:** lógica pura → unit. Leitura/escrita observável (estado persistido, tela) → integração/e2e. Asserção de chamada em Prisma mockado **não** satisfaz um check de estado persistido (T-outcome).

## US1 — Voluntário vê e confirma suas escalas próximas (P1, w=3)

**AC1.1** Voluntário com escalas futuras abre a home → vê próximas escalas em ordem cronológica com ministério, função, data e horário.
- I1 lista alocações futuras do próprio usuário · I2 ordem cronológica · I3 exibe ministério · I4 exibe função · I5 exibe data · I6 exibe horário
- T1 (unit) filtro "do usuário, futuras" asserido · T2 (unit) ordenação cronológica asserida · T3 (e2e) home renderiza os 4 campos

**AC1.2** Sem escala futura → mensagem clara.
- I1 estado vazio com mensagem
- T1 (e2e/unit) estado vazio asserido

**AC1.3** Escala dentro da janela de lembrete → push.
- I1 seleciona alocações na janela · I2 decide estágio do lembrete · I3 envia push · I4 (wiring) rota cron autorizada e agendada
- T1 (unit) decisão de estágio · T2 (unit) envio via notifyUser · T3 (integração) rota produz lembrete para alocação real na janela

## US2 — Líder cria escalas recorrentes e aloca (P1, w=3)

**AC2.1** Cria recorrente sem data fim → gera ocorrências futuras pelo padrão.
- I1 aceita sem data fim · I2 gera ocorrências pela RRULE na janela · I3 geração disparada após criar · I4 só líder do ministério cria
- T1 (unit) expansão da RRULE · T2 (integração) ocorrências persistidas + idempotência · T3 (unit) criação sem data fim aceita

**AC2.2** Líder aloca → voluntário passa a ver e é notificado.
- I1 cria alocação · I2 alocação aparece na agenda do voluntário · I3 envia notificação de atribuição
- T1 (integração) alocação persistida · T2 (unit) notificação disparada · T3 (e2e) voluntário vê a escala

**AC2.3** Excluir recorrente → oferece "só esta" e "todas a partir desta" e aplica.
- I1 UI oferece as duas opções · I2 SINGLE cancela só a ocorrência · I3 FROM_HERE cancela futuras e preserva passadas
- T1 SINGLE asserido · T2 FROM_HERE preserva passadas asserido

**AC2.4** Voluntário indisponível → líder é avisado ao alocar.
- I1 detecta conflito · I2 bloqueia/avisa o líder · I3 override explícito fica registrado
- T1 (unit/integ) detecção de conflito · T2 (unit) bloqueio sem override · T3 registro do override asserido

## US3 — Indisponibilidade do mês (P2, w=2)

**AC3.1** Marca dias/horários → sistema salva e exibe.
- I1 salva · I2 exibe
- T1 salvamento asserido · T2 exibição asserida

**AC3.2** Líder vê candidatos → indisponíveis sinalizados.
- I1 candidatos carregam flag de indisponível · I2 UI sinaliza
- T1 (unit) flag asserida · T2 (e2e) sinalização na UI

## US4 — Auto-alocação e troca (P2, w=2)

**AC4.1** Vaga livre + voluntário elegível se aloca → consta e a vaga deixa de ser livre.
- I1 exige elegibilidade · I2 cria alocação própria · I3 corrida resolvida (um vence) · I4 vaga sai da lista de livres
- T1 (unit) elegibilidade · T2 (integração) alocação persistida pelo serviço · T3 (integração) unicidade de vaga · T4 lista de livres exclui a vaga

**AC4.2** Pede troca → vira vaga no pool, qualquer elegível assume, original mantém até aceitar.
- I1 cria pedido OPEN · I2 pedido aparece no pool · I3 elegível assume (reatribuição) · I4 original mantém até alguém assumir
- T1 (unit) criação/reuso do pedido · T2 (unit) elegibilidade do claim · T3 (integração) reatribuição/manutenção do original asserida

## US5 — Admin: vagas e relatórios (P3, w=0 — informativo)
AC5.1 vagas sem alocação por proximidade · AC5.2 ranking de carga por período · AC5.3 voluntários por ministério.
