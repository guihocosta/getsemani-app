# Getsemani App Constitution

App de gestão da igreja Getsemani. MVP = Escalas de voluntários; visão de longo prazo = ERP modular da igreja. Esta constituição rege decisões de arquitetura, código e produto. Supera preferências pontuais; exceções exigem justificativa registrada.

## Core Principles

### I. Modularidade Primeiro (base do ERP)
Todo domínio vive isolado em `src/modules/<domínio>` com fronteiras explícitas (domain / services / repositories). Um módulo acessa somente suas próprias entidades; comunicação entre módulos passa por interfaces de serviço, nunca por acesso direto às tabelas alheias. Novos módulos (finanças, membros, patrimônio) entram sem reescrever o núcleo. Sem dependências circulares entre módulos.

### II. Custo Zero Sustentável (NÃO-NEGOCIÁVEL)
O app não pode gerar custo operacional fixo. Só são permitidos serviços/dependências com tier gratuito sustentável (atual: Vercel, Supabase, Web Push nativo VAPID). Qualquer recurso pago exige aprovação explícita do responsável antes de entrar. Preferir soluções nativas a vendors quando o vendor introduzir limite ou lock-in evitável.

### III. Deploy Simples
Deploy é `git push` → Vercel, sem etapas manuais de infra. Um app, um banco. Migrações versionadas (Prisma) rodam no pipeline. Nada de servidores para manter, filas ou serviços auxiliares no MVP. Configuração vive em variáveis de ambiente, nunca no código.

### IV. Simplicidade / YAGNI
Começar simples; não construir para requisitos que ainda não existem. Sem microserviços, sem camadas de abstração especulativas, sem cache/infra extra antes de haver problema medido. Modularizar código é organização — não é licença para complexidade de infraestrutura. Toda complexidade adicional precisa ser justificada por necessidade concreta.

### V. Testável nos Fluxos Críticos
Fluxos P1/P2 da spec têm teste e2e. Regras de negócio com risco — recorrência, exclusão "esta / desta data em diante", indisponibilidade com override, concorrência de vaga (1 pessoa por slot), agregações de relatório — têm teste unitário. Bug corrigido ganha teste que o reproduz. Cobertura segue o risco, não uma métrica cega.

### VI. Experiência do Voluntário Primeiro
O uso diário é do voluntário no celular. UI mobile-first, PWA instalável, estética Apple (limpa, hierarquia clara) com a identidade visual da Getsemani. A tela inicial mostra a próxima escala em segundos. O app funciona mesmo sem permissão de notificação (degradação graciosa). Interface em pt-BR.

## Restrições Técnicas

- **Stack fixa do MVP**: Next.js (App Router) + TypeScript; Supabase (Postgres + Auth); Prisma para schema/migrações no schema `public`; Web Push nativo (VAPID); Vercel + Vercel Cron. Trocar qualquer pilar exige registro em `research.md`.
- **Fronteira de dados**: Prisma gerencia só o schema `public`; o schema `auth` da Supabase é gerido pela Supabase. `User.id = auth.users.id`.
- **Tempo**: armazenar em UTC; exibir em `America/Sao_Paulo`.
- **Segredos**: só em variáveis de ambiente; nunca commitados. `service_role` e chaves privadas só no servidor.
- **Recorrência**: ocorrências materializadas por janela futura limitada — nunca geração infinita.

## Fluxo de Desenvolvimento

- Trabalho segue Spec Kit: `spec.md` → `plan.md` → `tasks.md` → implementação.
- Mudança de decisão técnica se registra em `research.md` (decisão + alternativa rejeitada + porquê).
- Cada entrega mapeia para User Stories/FRs da spec; escopo fora da spec não entra sem atualizar a spec.
- Antes de merge: fluxos críticos testados, sem segredo no diff, sem violação de fronteira de módulo.

## Governance

Esta constituição supera práticas ad-hoc. Toda complexidade e todo custo devem ser justificados contra os Princípios II e IV. Alterações à constituição exigem: motivo escrito, impacto nos módulos/custos, e atualização da versão abaixo. Em conflito entre velocidade e estes princípios, os princípios vencem — ou a constituição é emendada explicitamente.

**Version**: 1.0.0 | **Ratified**: 2026-07-13 | **Last Amended**: 2026-07-13
