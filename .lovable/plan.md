
# Filtro de leads inativos + atribuição em massa

## Objetivo
Permitir que admin/global identifiquem leads que pararam de interagir (sem mensagens há X dias) e atribuam esses leads em massa a um assessor.

## Definições
- **Inatividade** = tempo desde a última mensagem em `chat_messages` (inbound OU outbound), matched por `phone` normalizado com `leads.telefone_key`. Se o lead nunca teve mensagem, usa `data_criacao` como fallback.
- **Visibilidade**: apenas admin e global (via `useUserRole`).

## Mudanças

### 1. Backend (view de última interação)
Criar uma **view** `public.lead_last_interaction` que retorna `lead_id` + `last_interaction_at` (MAX entre última mensagem do telefone e `data_criacao`). Isso evita cálculo pesado no cliente e permite paginação/ordenação futura.

- GRANT SELECT para `authenticated`.

### 2. Filtro no `FiltersSidebar` (novo campo "Inatividade")
Adicionar após o bloco de Período, visível apenas para admin/global:

- Select "Sem interação há":
  - Todos (default)
  - 7+ dias
  - 30+ dias
  - 90+ dias
  - 180+ dias
  - Personalizado (input numérico de dias)

Estado novo em `filters`: `inatividadeDias` (`"all" | "7" | "30" | "90" | "180" | "custom"`) e `inatividadeCustomDias` (number).

### 3. Aplicação do filtro em `LeadsTable`
- Ao carregar leads, fazer join/lookup com `lead_last_interaction` (batch por lead ids após fetch atual, para não quebrar a paginação em `.range()`).
- Filtrar client-side: `last_interaction_at <= now - N dias`.
- Nova coluna opcional (só quando o filtro está ativo): "Última interação" mostrando data relativa (ex: "há 42 dias").

### 4. Seleção múltipla + atribuição em massa
Na `LeadsTable` (apenas admin/global):

- Checkbox na primeira coluna de cada linha + checkbox master no header (seleciona página atual).
- Barra de ação fixa no topo da tabela quando `selectedIds.length > 0`:
  - Texto: "N leads selecionados"
  - Botão "Atribuir a…" → abre modal reutilizando `AssignLeadDialog` em modo bulk (novo prop `leadIds: string[]`).
  - Botão "Limpar seleção".
- Modal em modo bulk:
  - Select de assessor (usa `useUsers`, apenas com role `user`/`admin`).
  - Confirmação: "Atribuir N leads a {nome}?"
  - UPDATE em lote via `supabase.from('leads').update({ responsavel_id }).in('id', ids)`.
  - Toast de sucesso + refresh da lista + limpar seleção.
  - Log em `user_activities` (type `bulk_assign`).

### 5. Detalhes técnicos
- Manter `getPisoDaFaixa` e demais regras existentes intocadas.
- Realtime da tabela `leads` já existe → após bulk update os cards atualizam sozinhos.
- Não mexer em Kanban nesta iteração (o filtro fica na aba Tabela onde a seleção múltipla faz mais sentido).

## Fora de escopo
- Notificar assessores de destino (pode ser feito depois via trigger existente `notify_lead_assigned`, que já dispara em UPDATE de `responsavel_id`).
- Distribuição via rodízio em massa (usuário optou por 1 assessor por vez).
- Filtro para não-admin.

## Ordem de execução
1. Migration: view `lead_last_interaction` + GRANT.
2. Update `FiltersSidebar` (novo campo, tipos).
3. Update `LeadsTable`: fetch da view, filtro por inatividade, coluna "Última interação", seleção múltipla, barra de ação.
4. Update `AssignLeadDialog` para aceitar `leadIds: string[]` (modo bulk) mantendo o modo single atual.
5. Registrar `user_activities` no bulk assign.
