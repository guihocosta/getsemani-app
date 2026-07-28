# Correção de Nomes Duplicados em Pessoas sem Conta + Configuração do Login por E-mail (Código OTP) — Design

**Data:** 28/07/2026  
**Status:** Aprovado pelo usuário  

---

## 1. Contexto e Objetivos

### Problemas Atuais
1. **Nomes Duplicados em "Pessoas Sem Conta" (`/admin/convidados`)**:
   Quando um líder escala uma mesma pessoa sem conta (ex: "Maria") em múltiplas ocorrências/vagas, a tela de administração exibe múltiplos cards individuais para o mesmo nome (uma linha por alocação). Além disso, o líder precisa vincular cada escalação manualmente uma a uma.
2. **Login por E-mail (Recebimento de Link em vez de Código de 6 dígitos)**:
   No login por e-mail (`signInWithOtp`), o Supabase Auth está configurado por padrão para enviar um Magic Link clicável contendo `{{ .ConfirmationURL }}`, enquanto a interface do aplicativo espera um código numérico de 6 dígitos (`{{ .Token }}`).

### Objetivos
- Agrupar as alocações de pessoas sem conta pelo nome no backend e na interface de gestão (`/admin/convidados`).
- Permitir ao líder vincular **todas** as escalações daquela pessoa sem conta a um usuário cadastrado de uma só vez (vínculo em lote atômico).
- Documentar e ajustar o login por e-mail para utilizar o código OTP de 6 dígitos via Supabase Dashboard e sanitizar as entradas no cliente e servidor.

---

## 2. Arquitetura e Alterações Propostas

### 2.1 Módulo `scheduling` (Agrupamento e Vínculo em Lote)

#### `src/modules/scheduling/services/listGuestAllocations.ts`
- Modificar o tipo de retorno para agrupar as alocações ativas por nome do convidado (`guestName`).
- Normalização de chave: `guestName.trim().toLowerCase()` para evitar duplicatas por variações de maiúsculas/espaços, mantendo a versão de exibição com a grafia original.

```ts
export type GuestOccurrenceDetail = {
  allocationId: string;
  slotId: string;
  occurrenceId: string;
  role: string;
  ministryName: string;
  when: string;
  date: Date;
};

export type GroupedGuestItem = {
  guestName: string;
  totalAllocations: number;
  allocations: GuestOccurrenceDetail[];
};

export async function listGuestAllocations(ministryIds: string[]): Promise<GroupedGuestItem[]>;
```

#### `src/modules/scheduling/services/linkGuestAllocation.ts`
- Adicionar o serviço `linkAllGuestAllocations` que recebe `guestName`, `userId`, `ministryIds` e `override?: boolean`.
- Encontra todas as alocações ativas onde `userId IS NULL` e `guestName` é igual (case-insensitive) nos ministérios do líder.
- **Validação de Indisponibilidade**: Checa se o usuário `userId` possui bloqueios de indisponibilidade em alguma das datas das ocorrências.
  - Se houver indisponibilidade e `override` for `false`, lança erro `UNAVAILABILITY_BLOCKED` com detalhe da data.
  - Se válido ou `override === true`, executa um `$transaction` no Prisma atualizando todas as alocações:
    - `userId = targetUserId`
    - `guestName = null`
    - `guestCpf = null`

---

### 2.2 Server Actions (`app/(app)/escalas/actions.ts`)

- Criar a action `linkAllGuestAction(guestName: string, userId: string, override?: boolean)`:
  - Obtém o usuário da sessão (`getSessionUser()`).
  - Obtém os ministérios gerenciados pelo líder (`ledMinistryIds`).
  - Executa `linkAllGuestAllocations({ guestName, userId, ministryIds, override })`.
  - Retorna `{ ok: true, count: number }` ou `{ ok: false, code: ActionCode, ref: string }`.

---

### 2.3 Interface de Usuário (`app/(app)/admin/convidados`)

#### `app/(app)/admin/convidados/page.tsx`
- Consome `listGuestAllocations` atualizado (retornando `GroupedGuestItem[]`).
- Renderiza a lista de convidados agrupados.

#### `app/(app)/admin/convidados/GuestRow.tsx` (ou `GroupedGuestRow.tsx`)
- **Visualização**:
  - Exibe o **Nome da Pessoa Sem Conta** em destaque.
  - Exibe uma badge com o total de escalações (ex: `3 escalações`).
  - Lista as ocorrências com Ministério, Função e Data/Hora formatada.
- **Ações**:
  - Um único botão **"Vincular a um usuário"** por card.
  - Ao clicar, abre o seletor `AllocatePicker`.
  - Ao selecionar o usuário, chama `linkAllGuestAction`.
  - Trata o retorno de indisponibilidade com confirmação inline (*"Possui indisponibilidade na data XX/XX. Vincular mesmo assim? [Sim] [Cancelar]"*).

---

### 2.4 Login por E-mail & Configuração Supabase OTP

#### Configuração do Supabase Dashboard (Guia de Configuração)
1. Acesse o **Supabase Dashboard** → Selecione o projeto.
2. Vá em **Authentication** → **Email Templates**.
3. Selecione a aba **Magic Link** (ou **OTP**).
4. No corpo do e-mail (Email Body), substitua o link clicável `{{ .ConfirmationURL }}` pela tag de código numérico `{{ .Token }}`.
5. Exemplo de template recomendado:
   ```html
   <h2>Seu código de acesso ao Getsemani App:</h2>
   <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">{{ .Token }}</p>
   <p>Digite este código de 6 dígitos no aplicativo para entrar.</p>
   ```
6. Salve as alterações.

#### Ajustes no Código (`app/(auth)/login/actions.ts` e `LoginForm.tsx`)
- In `sendCodeAction`: sanitizar e-mail (`email.trim().toLowerCase()`).
- In `verifyCodeAction`: sanitizar token (`token.trim()`) e e-mail.
- In `LoginForm.tsx`:
  - Exibir texto informativo abaixo do campo de e-mail ("Você receberá um código de 6 dígitos no seu e-mail").
  - Limpar espaços automaticamente antes de submeter.

---

## 3. Estratégia de Testes

1. **Testes Unitários (`tests/unit/linkAllGuestAllocations.test.ts`)**:
   - Testar a função de agrupamento de alocações.
   - Testar vínculo em lote sem indisponibilidade (sucesso e atualização atômica).
   - Testar vínculo em lote com bloqueio por indisponibilidade em 1 das ocorrências (`override = false` → erro; `override = true` → sucesso).
2. **Teste Manual**:
   - Escalar "Maria" em 2 eventos diferentes sem conta no painel de escalas.
   - Acessar `/admin/convidados` e confirmar que aparece apenas 1 card "Maria" com badge `2 escalações`.
   - Vincular a um usuário real e verificar se ambas as vagas foram atualizadas no painel de escalas.
   - Testar envio e verificação de código no login.
