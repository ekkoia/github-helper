
## Objetivo
Adicionar um botão de filtro ao lado da busca em "Conversas WhatsApp" (/chat) que abre um modal com filtros combináveis e persistentes entre sessões.

## Filtros disponíveis

1. **Por Tags** (múltipla seleção)
   - Lista todas as tags ativas do catálogo (`lead_tags`)
   - Conversa aparece se o lead tiver pelo menos uma das tags selecionadas (OR)

2. **Leads atribuídos sem conversa iniciada pelo assessor**
   - Toggle on/off
   - Mostra apenas conversas onde o lead tem `responsavel_id` definido, mas ainda não há nenhuma mensagem enviada por aquele assessor (`chat_messages.bot_message` do próprio assessor ausente / apenas mensagens inbound do lead)

3. **Por Assessor** (múltipla seleção, apenas admin/global)
   - Lista de assessores (de `profiles`)
   - Filtra conversas cujo lead vinculado tem `responsavel_id` em um dos selecionados
   - Para usuário comum: filtro oculto (ele já só vê os próprios)

## UI

- Botão ícone `SlidersHorizontal` (lucide) ao lado direito do input de busca no header do `ConversationList`
- Badge com contador quando há filtros ativos
- Abre `Dialog` do shadcn com 3 seções (Tags / Não iniciadas / Assessores) + botões "Limpar" e "Aplicar"
- Chips resumo dos filtros ativos abaixo da busca, cada um removível com X

## Persistência

- Salvar em `localStorage` com chave `chat:conversation-filters:v1` (por usuário: sufixo `user.id`)
- Carregar no mount do `ConversationList`
- Sem necessidade de tabela; é preferência puramente de UI local

## Alterações técnicas

- `src/hooks/useConversations.ts`: expor `hasAssessorMessage` por conversa (verificar se existe alguma linha em `chat_messages` para aquele phone onde `user_id = responsavel_id do lead` e `bot_message` não nulo). Retornar `responsavelId` além do `assessorName`.
- Novo `src/components/chat/ConversationFiltersDialog.tsx`: modal com as três seções, controlado por props `open`, `value`, `onChange`.
- Novo hook `src/hooks/useConversationFilters.ts`: gerencia estado + persistência no localStorage.
- `src/components/chat/ConversationList.tsx`:
  - adiciona botão filtro no header
  - aplica filtros ao array `filtered` (combinando com a busca atual)
  - renderiza chips de filtros ativos
- Reuso: `useLeadTagsCatalog`, `useAllLeadTagAssignments`, `useUsers` (para lista de assessores).

## Fora do escopo
- Não altera lógica de RLS/visibilidade.
- Não persiste filtros no banco (apenas localStorage por enquanto).
- Não altera design system nem cores.
