# Feature Specification: App de Escalas (MVP)

**Feature Branch**: `001-escalas-mvp`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "Vamos montar um App de Escalas, a versão MVP. Precisamos de uma opção para criar escalas de maneira recorrente, sem uma data fim específica (na hora de excluir, opção de excluir ou um todos a partir da data, bem padrão). O líder poderá colocar alguém na escala, dentro de uma função naquele ministério, ou a pessoa pode se alocar em alguma escala livre (opção para pedir troca). O voluntário vai poder dizer quais dias e horários ela não vai poder naquele mês (como no Volutz). Vamos ter relatórios para saber quais pessoas estão em mais escalas e quais ministérios tem mais voluntários. Na tela do Admin, deve mostrar qual escala ainda está sem ninguém alocada. O sistema deve ter notificações (PWA). Visualização de escalas próximas simples na tela inicial. Design inspirado na Apple, seguindo a identidade visual da igreja. Deploy fácil, sem custos, escalável para virar um ERP no futuro."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voluntário vê e confirma suas escalas próximas (Priority: P1)

Um voluntário abre o app e, na tela inicial, vê imediatamente suas próximas escalas (ministério, função, data e horário) em ordem cronológica, de forma simples e limpa. Ele recebe uma notificação conforme a data se aproxima.

**Why this priority**: É o valor central do app para a maioria dos usuários (voluntários). Sem visualização clara das próprias escalas, nada mais importa. Entrega valor sozinho mesmo sem os módulos de gestão.

**Independent Test**: Criar um voluntário com escalas atribuídas e verificar que a tela inicial lista as próximas escalas corretamente e que uma notificação é disparada próxima à data.

**Acceptance Scenarios**:

1. **Given** um voluntário com escalas futuras atribuídas, **When** ele abre a tela inicial, **Then** vê a lista de suas próximas escalas em ordem cronológica com ministério, função, data e horário.
2. **Given** um voluntário sem nenhuma escala futura, **When** ele abre a tela inicial, **Then** vê uma mensagem clara indicando que não há escalas próximas.
3. **Given** uma escala do voluntário se aproximando (dentro da janela de lembrete), **When** o horário do lembrete chega, **Then** o voluntário recebe uma notificação push.

---

### User Story 2 - Líder cria escalas recorrentes e aloca voluntários (Priority: P1)

Um líder cria uma escala recorrente para um ministério (ex.: culto de domingo, toda semana), sem data fim obrigatória. Para cada ocorrência e função, o líder aloca voluntários. Ao excluir, o líder escolhe entre excluir apenas aquela ocorrência ou todas a partir daquela data.

**Why this priority**: É a operação central de gestão. Sem criação de escalas e alocação, os voluntários não têm o que visualizar. Junto com a US1 forma o MVP mínimo viável.

**Independent Test**: Um líder cria uma escala recorrente semanal, aloca um voluntário numa função, e depois exclui "a partir desta data" — verificando que as ocorrências futuras somem e as passadas permanecem.

**Acceptance Scenarios**:

1. **Given** um líder de um ministério, **When** ele cria uma escala recorrente sem data fim, **Then** o sistema gera as ocorrências futuras segundo o padrão de recorrência definido.
2. **Given** uma ocorrência de escala com funções definidas, **When** o líder aloca um voluntário numa função, **Then** o voluntário passa a ver essa escala e recebe notificação da atribuição.
3. **Given** uma escala recorrente, **When** o líder escolhe excluir, **Then** o sistema oferece "excluir apenas esta ocorrência" ou "excluir todas a partir desta data" e aplica a opção escolhida.
4. **Given** um voluntário marcou indisponibilidade para o dia/horário, **When** o líder tenta alocá-lo, **Then** o sistema avisa sobre o conflito de indisponibilidade.

---

### User Story 3 - Voluntário informa indisponibilidade do mês (Priority: P2)

O voluntário informa, para um determinado mês, quais dias e horários não poderá servir (similar ao Volutz). Essa informação orienta os líderes ao montar as escalas.

**Why this priority**: Reduz conflitos e retrabalho na alocação. Importante, mas o MVP funciona mesmo sem ela (líderes podem alocar manualmente e ajustar).

**Independent Test**: Um voluntário marca indisponibilidade em datas/horários específicos de um mês e verifica que essas marcações ficam visíveis para o líder ao alocar.

**Acceptance Scenarios**:

1. **Given** um voluntário, **When** ele marca dias e horários indisponíveis para um mês, **Then** o sistema salva e exibe essas restrições.
2. **Given** restrições de indisponibilidade registradas, **When** o líder visualiza candidatos para uma função, **Then** os voluntários indisponíveis naquele dia/horário são sinalizados.

---

### User Story 4 - Voluntário se aloca em escala livre e pede troca (Priority: P2)

O voluntário visualiza escalas com vagas abertas (funções sem ninguém alocado) e pode se auto-alocar. Também pode solicitar troca de uma escala que já é sua.

**Why this priority**: Dá autonomia aos voluntários e alivia o líder, mas depende de escalas já existirem (US2).

**Independent Test**: Deixar uma função sem alocação, o voluntário se auto-aloca com sucesso; depois ele pede troca de uma escala sua e o pedido fica registrado para resolução.

**Acceptance Scenarios**:

1. **Given** uma função de escala sem voluntário alocado, **When** um voluntário elegível se auto-aloca, **Then** ele passa a constar na escala e a vaga deixa de aparecer como livre.
2. **Given** uma escala atribuída a um voluntário, **When** ele pede troca, **Then** a escala vira vaga aberta no pool e qualquer voluntário elegível pode assumi-la, permanecendo com o original até alguém aceitar.

---

### User Story 5 - Admin vê escalas sem alocação e relatórios (Priority: P3)

O Admin acessa um painel que mostra quais escalas (funções) ainda estão sem ninguém alocado, para agir. Também vê relatórios: pessoas em mais escalas (para equilibrar carga/treinar novos) e ministérios com mais/menos voluntários (para saber quem precisa de gente).

**Why this priority**: Ferramenta de gestão estratégica. Alto valor para liderança, mas não bloqueia o uso diário de voluntários e líderes.

**Independent Test**: Com escalas e alocações existentes, o painel Admin lista corretamente as vagas em aberto e os relatórios de carga por pessoa e de voluntários por ministério.

**Acceptance Scenarios**:

1. **Given** escalas com funções não preenchidas, **When** o Admin abre o painel, **Then** vê a lista das escalas/funções sem alocação, ordenadas por proximidade da data.
2. **Given** dados de alocação acumulados, **When** o Admin abre o relatório de carga, **Then** vê o ranking de pessoas por quantidade de escalas em um período.
3. **Given** voluntários distribuídos por ministério, **When** o Admin abre o relatório de ministérios, **Then** vê a contagem de voluntários por ministério para identificar quais precisam de mais gente.

---

### Edge Cases

- **Alocação em dia de indisponibilidade**: bloqueada por padrão; o líder pode fazer override explícito registrado (FR-012).
- **Exclusão de ocorrência já passada**: escalas passadas são preservadas como histórico; "excluir a partir desta data" afeta apenas ocorrências futuras.
- **Auto-alocação simultânea**: dois voluntários tentam pegar a mesma vaga livre ao mesmo tempo — apenas um é confirmado, o outro recebe aviso de que a vaga foi preenchida.
- **Auto-alocação em conflito com a própria indisponibilidade**: sistema avisa antes de confirmar.
- **Notificação sem permissão**: usuário não concedeu permissão de push — app mostra as escalas normalmente e sinaliza que notificações estão desativadas.
- **Recorrência sem data fim ao longo do tempo**: o sistema materializa ocorrências dentro de uma janela futura razoável, não infinitamente.
- **Voluntário removido de um ministério** que tinha escalas futuras: as escalas futuras dele naquele ministério ficam como vagas em aberto.
- **Pedido de troca sem quem assuma**: a vaga fica aberta no pool e a escala permanece atribuída ao voluntário original até alguém elegível aceitar.

## Requirements *(mandatory)*

### Functional Requirements

**Escalas e recorrência**

- **FR-001**: O sistema MUST permitir que líderes criem escalas recorrentes vinculadas a um ministério, sem data fim obrigatória, definindo um padrão de recorrência (ex.: semanal em determinado dia/horário).
- **FR-002**: O sistema MUST gerar automaticamente as ocorrências futuras de uma escala recorrente dentro de uma janela futura configurável.
- **FR-003**: O sistema MUST permitir a exclusão de uma escala com pelo menos as opções "excluir apenas esta ocorrência" e "excluir todas a partir desta data".
- **FR-004**: O sistema MUST preservar ocorrências passadas como histórico ao excluir ocorrências futuras.
- **FR-005**: Cada ocorrência de escala MUST conter uma ou mais funções (papéis) definidas dentro do ministério.

**Alocação**

- **FR-006**: Líderes MUST poder alocar um voluntário a uma função específica de uma ocorrência de escala.
- **FR-007**: O sistema MUST permitir que voluntários elegíveis se auto-aloquem em funções que estão sem ninguém alocado ("escala livre").
- **FR-008**: O sistema MUST impedir que uma mesma vaga (função em uma ocorrência) seja ocupada por mais de um voluntário, resolvendo tentativas simultâneas de forma consistente.
- **FR-009**: Voluntários MUST poder solicitar troca de uma escala já atribuída a eles, gerando um pedido rastreável.
- **FR-010**: O sistema MUST manter a atribuição original de uma escala até que o pedido de troca seja resolvido conforme FR-024.

**Indisponibilidade**

- **FR-011**: Voluntários MUST poder registrar, por mês, os dias e horários em que estarão indisponíveis.
- **FR-012**: O sistema MUST impedir, por padrão, a alocação de um voluntário em dia/horário que ele marcou como indisponível, permitindo ao líder um override explícito ("alocar mesmo assim") que fica registrado.
- **FR-013**: O sistema MUST avisar o voluntário quando ele tentar se auto-alocar em um horário que marcou como indisponível.

**Notificações**

- **FR-014**: O sistema MUST enviar notificações push (via PWA) para o voluntário quando ele for alocado em uma escala.
- **FR-015**: O sistema MUST enviar lembrete por notificação conforme a data da escala se aproxima.
- **FR-016**: O sistema MUST notificar as partes relevantes sobre pedidos de troca e sua resolução.
- **FR-017**: O sistema MUST funcionar normalmente (exibir escalas) mesmo quando o usuário não concedeu permissão de notificação.

**Visualização e painéis**

- **FR-018**: A tela inicial MUST exibir as próximas escalas do usuário de forma simples e legível, em ordem cronológica.
- **FR-019**: O painel do Admin MUST listar as escalas/funções ainda sem alocação, priorizadas por proximidade da data.
- **FR-020**: O sistema MUST fornecer um relatório de carga mostrando o ranking de pessoas por quantidade de escalas em um período.
- **FR-021**: O sistema MUST fornecer um relatório de voluntários por ministério, para identificar ministérios com falta de gente.

**Papéis e acesso**

- **FR-022**: O sistema MUST distinguir os papéis de Admin, Líder (de um ou mais ministérios) e Voluntário, com permissões correspondentes.
- **FR-023**: Líderes MUST ter suas ações de criação/alocação restritas aos ministérios que lideram; Admin MUST ter visão de todos os ministérios.
- **FR-024**: Ao pedir troca, o sistema MUST liberar a escala como vaga aberta (pool), permitindo que qualquer voluntário elegível a assuma; a atribuição original permanece até que alguém aceite.

**Identidade e plataforma**

- **FR-025**: A interface MUST seguir uma estética inspirada na Apple (limpa, minimalista, hierarquia clara) aplicando a identidade visual (cores/logo) da igreja.
- **FR-026**: O app MUST ser instalável como PWA em dispositivos móveis.

### Key Entities *(include if feature involves data)*

- **Usuário**: pessoa do sistema; atributos: nome, contato, papel(éis) (Admin/Líder/Voluntário), ministérios associados.
- **Ministério**: unidade organizacional da igreja; possui funções, líderes e voluntários.
- **Função (Papel)**: papel exercido dentro de um ministério em uma escala (ex.: vocal, som, projeção, recepção).
- **Escala (recorrente)**: definição de uma escala com ministério, padrão de recorrência e ausência opcional de data fim.
- **Ocorrência de Escala**: instância concreta de uma escala em uma data/horário específicos, contendo funções a preencher.
- **Alocação**: vínculo entre um voluntário e uma função em uma ocorrência de escala.
- **Indisponibilidade**: registro de um voluntário indicando dias/horários que não pode servir em um mês.
- **Pedido de Troca**: solicitação de um voluntário para deixar uma escala atribuída, com estado (pendente/resolvido).
- **Notificação**: mensagem enviada ao usuário (atribuição, lembrete, troca).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um voluntário identifica sua próxima escala em até 5 segundos após abrir o app, sem precisar navegar por menus.
- **SC-002**: Um líder cria uma escala recorrente e aloca voluntários para uma ocorrência em menos de 3 minutos.
- **SC-003**: 90% das notificações de lembrete são entregues aos usuários com permissão concedida antes da data da escala.
- **SC-004**: O Admin consegue identificar todas as vagas em aberto da semana em uma única tela, sem exportar dados.
- **SC-005**: Os relatórios de carga por pessoa e de voluntários por ministério refletem os dados atuais e são gerados em menos de 5 segundos.
- **SC-006**: Reduzir em pelo menos 50% os conflitos de alocação (pessoas escaladas em dias que marcaram indisponíveis) em comparação ao processo manual atual.
- **SC-007**: O app é instalável como PWA e utilizável em celulares sem instrução prévia por 80% dos voluntários no primeiro uso.

## Assumptions

- **Escopo MVP**: o foco é escalas de voluntários; módulos futuros (ERP: finanças, patrimônio, etc.) estão fora deste MVP, mas a modelagem deve permitir extensão modular.
- **Recorrência**: o padrão principal esperado é semanal (dia da semana + horário); outros padrões podem existir mas semanal cobre o caso da igreja.
- **Janela de materialização**: ocorrências recorrentes sem data fim são geradas dentro de uma janela futura razoável (ex.: alguns meses à frente), não infinitamente.
- **Autenticação**: login padrão por conta (e-mail/senha ou provedor social), reutilizável pelos módulos futuros.
- **Notificações**: push via PWA é o canal principal do MVP; um provedor de push (ex.: OneSignal) pode ser usado como implementação, decidido na fase de plano.
- **Custo zero / deploy simples**: a solução deve rodar em plataforma de deploy gratuita/simples, priorizando ausência de custos operacionais fixos.
- **Escala/ERP futuro**: a arquitetura deve suportar adição de novos módulos sem reescrita do núcleo.
- **Idioma**: interface em português (pt-BR).
- **Indisponibilidade mensal**: registrada por mês, alinhada ao ciclo de montagem de escalas da igreja.
