## Objetivo

1. Garantir que leads que chegaram via WhatsApp (existem em `chat_messages`) mas nunca viraram "Lead novo!" apareçam no /leads numa etapa específica, sem consumir fila de assessor.
2. Adicionar uma seção "Interações" no modal de detalhes do lead, unificando `chat_messages` + `n8n_chat_histories` numa timeline cronológica, com botão "Atualizar".

## Diagnóstico

- 284 telefones distintos em `chat_messages`. Cerca de 1.505 mensagens sem lead correspondente em `leads` (telefone normalizado).
- `n8n_chat_histories.session_id` = telefone (formato `+55...`), mesmo formato usado por `chat_messages.phone`.
- Hoje, conversas WhatsApp só viram lead via `webhook-lead` quando a IA qualifica; se o usuário não responde / não qualifica, fica invisível no CRM.

## Mudanças

### 1. Nova etapa do funil

Inserir em `funil_etapas`:
- nome: `Lead WhatsApp (não qualificado)`
- ordem: 13
- cor: cinza (`#9ca3af`)
- ativo: true

### 2. Backfill dos leads órfãos do WhatsApp

Para cada telefone em `chat_messages` sem lead correspondente:
- INSERT em `leads` com:
  - `nome_completo` = primeiro `nomewpp` não nulo (ou "Lead WhatsApp")
  - `telefone` = phone
  - `origem` = `whatsapp`, `origens` = `["whatsapp"]`
  - `etapa_funil` = `Lead WhatsApp (não qualificado)`
  - `responsavel_id` = NULL (só admin vê — comportamento atual já está correto via RLS)
  - `data_criacao` = MIN(created_at) do chat
  - `observacoes` = `[Importado de chat_messages]`

### 3. Trigger automático para futuros chats

Trigger `AFTER INSERT` em `chat_messages`:
- Se `phone` não casa com nenhum lead, cria um novo lead com etapa `Lead WhatsApp (não qualificado)`, sem responsável.
- Se já existe, não faz nada (a qualificação posterior via `webhook-lead` continua atualizando normalmente).
- Ajustar `auto_assign_lead` para não distribuir leads dessa etapa (early return se `etapa_funil = 'Lead WhatsApp (não qualificado)'`), garantindo que fiquem sem responsável.

### 4. Seção "Interações" no `LeadDetailsModal.tsx`

Nova seção entre "Nota do Assessor" e "Observações":
- Fetch quando o modal abre (e ao clicar "Atualizar"):
  - `chat_messages` filtrado por `phone` normalizado = telefone do lead
  - `n8n_chat_histories` filtrado por `session_id` normalizado = telefone do lead
- Unificar e ordenar (chat_messages por `created_at`; n8n por `id` como fallback).
- Render: timeline com bolha à esquerda (mensagem do usuário) / direita (IA/bot), com timestamp e fonte.
- Estado vazio: "Nenhuma interação registrada".
- Botão "Atualizar" no header da seção.

## Detalhes técnicos

- Normalização de telefone: `regexp_replace(telefone, '[^0-9]', '', 'g')` (já usado em `auto_assign_lead`).
- A busca client-side pode usar `.ilike` no telefone limpo via RPC, ou simplesmente buscar todos `chat_messages` onde phone contém os últimos 10 dígitos do lead. Vou criar uma RPC `get_lead_interactions(_lead_id uuid)` que retorna timeline já unificada e ordenada.
- Não mexer em telas que não foram solicitadas (Kanban, Dashboard, filtros, etc.).

## Não incluído

- Não vou refazer a lógica de qualificação do `webhook-lead`.
- Não vou mexer em outros leads órfãos (Meta, etc.) — escopo é só WhatsApp.
- Sem realtime — apenas refetch manual via botão "Atualizar".