# Conta Meta WhatsApp compartilhada

## Objetivo
Uma única conta Meta (configurada por um admin global) passa a ser usada por todos os usuários do sistema. Usuários comuns e admins não precisam mais configurar a própria conta.

## Mudanças

### 1. `src/hooks/useMetaAccount.ts`
Em vez de buscar `whatsapp_meta_accounts` filtrando por `user_id` do usuário logado, buscar a conta compartilhada — a primeira/única linha da tabela (ordenada por `created_at` ascendente, `limit(1)`). Todos os usuários passam a receber a mesma conta.

### 2. `src/components/configuracoes/WhatsAppMetaSection.tsx`
- Buscar e salvar a conta compartilhada (sem filtrar por `user_id`; usar a linha existente se houver, senão criar uma nova vinculada ao `user_id` do global admin atual).
- Renderizar o formulário completo apenas para **global admin** (`isGlobal`). Para os demais (user/admin), mostrar somente um card informativo: "Conta Meta compartilhada — configurada pela administração" + nome da conta conectada, sem campos editáveis nem botões.

### 3. RLS de `whatsapp_meta_accounts` (migration)
Atualmente as policies provavelmente restringem leitura/escrita ao próprio `user_id`. Ajustar para:
- `SELECT`: qualquer usuário autenticado (todos precisam ler a conta para enviar mensagens via `ChatWindow`/`MetaChatInput`).
- `INSERT` / `UPDATE` / `DELETE`: somente role `global` (via `has_role(auth.uid(), 'global')`).

Confirmo as policies atuais antes de escrever a migration.

## Não muda
- Schema da tabela (mantém `user_id` apenas como "quem cadastrou").
- Edge functions que já leem a conta via service_role.
- `whatsapp_meta_templates` (continuam vinculados à conta).

## Observação
Se hoje existirem múltiplas linhas em `whatsapp_meta_accounts` (uma por usuário), depois desta mudança apenas a primeira será usada. Posso opcionalmente apagar as duplicadas — me avisa se quer que eu faça isso ou se prefere manter como histórico.
