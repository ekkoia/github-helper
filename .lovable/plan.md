

# Vincular lead e etapa do funil aos eventos da agenda

## O que será feito

Adicionar campos opcionais de **Lead** e **Etapa do funil** no dialog de criação/edição de eventos. Ao associar um lead, o evento fica vinculado (campo `lead_id` já existe na tabela). A etapa do funil será armazenada no campo `metadata` (já existente como JSONB) — sem necessidade de migration.

## Alterações

### 1. `src/components/agenda/AgendaEventDialog.tsx`
- Receber nova prop `leads` (lista simplificada: `{id, nome_completo}[]`)
- Adicionar estado `leadId` e `etapaFunil`
- Adicionar select de **Lead** com busca (Combobox ou Select com opções)
- Adicionar select de **Etapa do funil** usando `useFunilEtapas()` — mostra badge colorida
- Ao selecionar um lead, preencher `lead_id` no `CreateEventData`
- Armazenar `etapa_funil` dentro de `metadata`
- Na edição, inicializar `leadId` com `event.lead_id` e `etapaFunil` com `event.metadata?.etapa_funil`

### 2. `src/hooks/useAgendaEvents.ts`
- `CreateEventData`: adicionar campo opcional `metadata?: Record<string, any>`
- No `createEvent` e `updateEvent`, fazer merge da metadata

### 3. `src/pages/Agenda.tsx`
- Buscar leads do Supabase (id, nome_completo) para passar ao dialog
- Passar prop `leads` ao `AgendaEventDialog`

### 4. `src/components/agenda/AgendaEventList.tsx`
- Exibir nome do lead e etapa do funil (badge colorida) nos cards de eventos que tenham essa informação

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/agenda/AgendaEventDialog.tsx` | Adicionar selects de lead e etapa |
| `src/hooks/useAgendaEvents.ts` | Suportar metadata no CreateEventData |
| `src/pages/Agenda.tsx` | Buscar leads e passar ao dialog |
| `src/components/agenda/AgendaEventList.tsx` | Exibir lead e etapa nos cards |

Nenhuma migration necessária — `lead_id` e `metadata` (JSONB) já existem na tabela.

