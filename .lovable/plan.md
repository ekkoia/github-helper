
## Notificações push no app instalado (novo lead + nova mensagem WhatsApp)

Hoje o PWA só tem manifest + ícones. Para receber notificação no celular mesmo com o app fechado, precisamos de **Web Push (VAPID)** com service worker.

### Compatibilidade
- **Android (Chrome):** funciona com o app instalado ou até no navegador.
- **iOS (Safari):** só funciona **se o usuário instalar o app na tela inicial** (Add to Home Screen). iOS 16.4+.
- **Desktop:** funciona no Chrome/Edge/Firefox.

### O que vou implementar

1. **Service Worker de push** (`public/sw.js`)
   - Registrado só em produção, nunca no preview Lovable.
   - Handlers `push` (mostrar notificação com título/corpo/ícone/tag) e `notificationclick` (abrir a URL correta: `/chat?phone=...` para mensagem, `/leads` ou detalhes do lead para novo lead atribuído).
   - Notificações com mesma `tag` se substituem (ex.: várias mensagens do mesmo lead viram uma só).

2. **Chaves VAPID**
   - Gerar par de chaves VAPID.
   - `VITE_VAPID_PUBLIC_KEY` no `.env` (pública, usada no frontend).
   - `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` como secrets da edge function.

3. **Tabela `push_subscriptions`**
   - Colunas: `user_id`, `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `created_at`, `last_used_at`.
   - RLS: usuário só vê/insere/apaga suas próprias subscriptions; service_role acessa todas.
   - Grants para `authenticated` e `service_role`.

4. **UI de opt-in no Perfil**
   - Novo card "Notificações push" com toggle master + dois sub-toggles:
     - **Novo lead atribuído a mim**
     - **Nova mensagem de WhatsApp em conversa minha**
   - Preferências salvas em `user_preferences` (colunas novas `push_new_lead` e `push_new_message`, default `true`).
   - Fluxo: pede permissão → registra SW → `pushManager.subscribe` com a VAPID pública → salva no Supabase.
   - Mostra estado (ativado / bloqueado / não suportado / dispositivo não instalado no iOS).

5. **Edge function `send-push-notification`**
   - Recebe `{ user_id, title, body, url, tag, kind }` (`kind` = `new_lead` | `new_message`).
   - Antes de enviar, checa `user_preferences` para respeitar o toggle do tipo (`push_new_lead` / `push_new_message`).
   - Busca subscriptions do usuário e envia via `npm:web-push` com as chaves VAPID.
   - Remove subscriptions inválidas (410/404) automaticamente.

6. **Disparo automático — novo lead atribuído**
   - Trigger AFTER INSERT/UPDATE em `leads`: quando `responsavel_id` muda para um usuário (ou é setado no insert), chama a edge function via `pg_net` com título/corpo do lead e URL do detalhe.

7. **Disparo automático — nova mensagem WhatsApp**
   - Trigger AFTER INSERT em `chat_messages` para `message_direction = 'inbound'` (só mensagens recebidas do lead, não as enviadas pelo assessor).
   - Descobre o dono: procura `leads.responsavel_id` pelo `telefone_key` do `chat_messages.phone`. Se houver responsável, dispara para ele. Se não houver, ignora (sem spam para admins).
   - Debounce simples via `tag = "chat:<phone_key>"` — várias mensagens seguidas do mesmo lead atualizam a mesma notificação em vez de empilhar.
   - URL do clique: `/chat?phone=<telefone>&name=<nome>`.

### Fora do escopo desta etapa
- Notificação para leads em `Leads FDS` sem atendimento.
- Notificação para lembretes de agenda.
- Central de preferências com granularidade por horário (não perturbe).
- Push para admins acompanharem tudo — só o responsável do lead recebe.

### Arquivos envolvidos
- `public/sw.js` (novo — só push, com guardas de preview)
- `src/hooks/usePushNotifications.ts` (novo)
- `src/components/PushNotificationSettings.tsx` (novo, usado em Perfil)
- `src/pages/Perfil.tsx` (adicionar card)
- `supabase/functions/send-push-notification/index.ts` (nova edge function)
- Migração: tabela `push_subscriptions` + colunas em `user_preferences` + trigger em `leads` + trigger em `chat_messages`

### Resultado esperado
Depois de instalar o app no celular e ativar no Perfil, o assessor recebe notificação nativa em dois casos, mesmo com o app fechado:
- "Novo lead atribuído: João Silva" → abre o lead.
- "João Silva: Olá, tudo bem?" → abre a conversa em `/chat`.

Tudo respeitando os toggles individuais e sem gerar push para mensagens enviadas pelo próprio assessor.
