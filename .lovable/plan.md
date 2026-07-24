## Objetivo
Exibir os chips de tags de cada lead na lista lateral de conversas em `/chat`, logo abaixo da última mensagem, conforme o print.

## Mudanças

**1. `src/hooks/useConversations.ts`**
- Incluir `lead_id` em cada objeto `Conversation` (já buscamos os leads pelo telefone; basta propagar o `id`).

**2. `src/hooks/useLeadTags.ts`**
- Reaproveitar `useAllLeadTagAssignments` (já existe) e `useLeadTagsCatalog` (já existe) — sem alteração.

**3. `src/components/chat/ConversationList.tsx`**
- Importar `useAllLeadTagAssignments` e `useLeadTagsCatalog`.
- Após a linha da última mensagem, renderizar uma linha com os chips das tags do lead (buscando via `assignmentsMap[conv.leadId]` e o catálogo).
- Estilo: chips pequenos (text-[10px], px-1.5 py-0.5, rounded), com cor de fundo da tag e texto com contraste automático (reaproveitar util já usada em `LeadTagsSection`, ou inline simples). Máximo ~3 chips visíveis, com `+N` se sobrar.
- Wrap em `flex flex-wrap gap-1 mt-1`.

## Fora de escopo
- Não altero lógica de janela 24h, realtime, ou filtros.
- Não adiciono edição de tags na lista (edição continua no painel lateral direito).

## Detalhes técnicos
Contraste: converter hex para luminância e escolher `#fff` ou `#000` (mesma função já usada em `TagChip`).
