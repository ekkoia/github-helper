# Página /campanhas — disparos em massa (broadcast)

## Objetivo

Uma página nova onde qualquer usuário monta uma campanha de template, escolhe o público por filtros, revisa/desmarca leads e dispara. Nada de atribuição de leads: o dono do lead continua o mesmo, e a mensagem enviada aparece normalmente no chat da conversa daquele assessor (mesmo comportamento do disparo atual, que grava em `chat_messages`).

## Regra de proteção (conversa ativa)

Um lead é **automaticamente excluído** da campanha quando:

- tem janela de 24h da Meta aberta (o lead respondeu recentemente), ou
- existe qualquer mensagem (recebida ou enviada) para aquele telefone nos **últimos 7 dias**.

Esses leads aparecem na tela como "em conversa ativa — bloqueados", com a contagem, e nunca entram no envio, mesmo que estejam marcados.

## Fluxo da página

1. **Nova campanha**: nome da campanha + template aprovado (mesma lista de templates do disparo atual).
2. **Filtros do público**: etapa do funil, origem, tag, responsável, "sem interação há" (7/30/90+ dias) e busca por nome/telefone.
3. **Pré-visualização**: tabela com os leads do filtro, checkbox por linha (todos marcados por padrão), e badges por lead: sem telefone, conversa ativa (bloqueado), elegível.
4. **Resumo antes de disparar**: total no filtro, elegíveis, bloqueados por conversa ativa, sem telefone.
5. **Confirmar disparo**: envia um a um com barra de progresso, exatamente como hoje (`send-whatsapp-message` + registro em `chat_messages` para aparecer no chat do assessor dono).
6. **Histórico**: lista de campanhas com data, autor, template, totais (enviados / falhas / bloqueados) e detalhe por lead com status de entrega.

## Permissões

- A página fica disponível para **todos** os usuários (item novo no menu lateral).
- **Admin / global / SDR**: podem montar campanhas com a base inteira.
- **Assessor comum**: o público é restrito aos leads sob a responsabilidade dele (mesma visibilidade que ele já tem em /leads).

## Detalhes técnicos

Banco (migração):

- `public.campanhas`: nome, template_name, template_language, criado_por, status (`rascunho` | `enviando` | `concluida`), totais (`total_publico`, `total_enviado`, `total_falha`, `total_bloqueado`), `created_at`/`updated_at` + trigger de updated_at.
- `public.campanha_destinatarios`: `campanha_id`, `lead_id`, `telefone`, `status` (`pendente` | `enviado` | `falha` | `bloqueado_conversa_ativa` | `sem_telefone`), `meta_message_id`, `erro`, `created_at`.
- GRANTs para `authenticated` e `service_role`; RLS: admin/global/SDR veem todas as campanhas, usuário comum vê apenas as próprias (`criado_por = auth.uid()`); insert/update apenas do próprio registro (admin em todas).
- Nenhuma alteração em `leads`, rodízio, RLS de chat, triggers da Meta ou janelas de conversa.

Front-end:

- `src/pages/Campanhas.tsx` + rota `/campanhas` em `App.tsx` e item no `AppSidebar.tsx`.
- `src/components/campanhas/CampanhaBuilder.tsx` (filtros + tabela de seleção), `CampanhaSendDialog.tsx` (confirmação e progresso), `CampanhasHistory.tsx` (histórico + detalhe).
- `src/hooks/useCampanhas.ts`: carrega campanhas/destinatários e grava o resultado do envio.
- Cálculo do bloqueio reaproveitando o que já existe: `whatsapp_conversation_windows.expires_at > now()` e última mensagem em `chat_messages` por `phone` (normalização via `src/lib/phoneMatch.ts`).
- Envio reaproveita a lógica já validada de `BulkTemplateDialog.tsx` (montagem de componentes de header/variáveis, `supabase.functions.invoke("send-whatsapp-message")`, insert em `chat_messages` com `message_direction: "outbound"`).
- O disparo em massa atual em /leads permanece intacto.
