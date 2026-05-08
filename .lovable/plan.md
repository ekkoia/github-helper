## Problema

Lead `Bruno Velloso` (`bruvelloso@gmail.com`) já existia desde 23/01/2026 sem `responsavel_id`, porque na época não havia `auto_assign_config` configurada para a faixa `ate_10k` (só foi configurada em 02/03/2026). A nova submissão Meta de hoje passou por `ON CONFLICT DO UPDATE` do `sync_meta_lead_to_crm` — esse caminho **não re-executa** o trigger `auto_assign_lead` (que é `BEFORE INSERT`), então o lead seguiu órfão.

Bug estrutural: **toda vez que um lead Meta antigo sem `responsavel_id` recebe nova submissão, ele continua sem dono**, mesmo já existindo fila configurada.

## Solução

### 1. Atualizar `sync_meta_lead_to_crm` para reatribuir no merge

Refatorar o trigger para que, no bloco `ON CONFLICT ... DO UPDATE`, quando `leads.responsavel_id IS NULL`, ele consuma o round-robin da faixa correspondente e preencha `responsavel_id`:

- Extrair lógica de seleção do próximo assessor para uma função SQL `pick_next_assessor(faixa text) returns uuid`, que avança o `auto_assign_state.last_assigned_order`.
- Refatorar `auto_assign_lead` para usar `pick_next_assessor`.
- No `sync_meta_lead_to_crm`, dentro do `DO UPDATE`, calcular faixa pelo `valor_produto` final e setar `responsavel_id = COALESCE(leads.responsavel_id, pick_next_assessor(faixa))`.
- Se a fila estiver vazia para a faixa, `responsavel_id` permanece NULL (comportamento atual).

### 2. Backfill pontual do lead Bruno Velloso

- Atribuir o lead `832d135e-d9fe-4720-b7e0-0ba828c45d70` ao próximo assessor da fila `ate_10k` (via `pick_next_assessor('ate_10k')`).
- **Manter** a etapa atual (`Lead NÃO qualificado (motivos pré definidos)`) — não alterar.
- **Não** rodar backfill em massa nos demais leads Meta órfãos.

## Arquivos / objetos afetados

- Nova função `public.pick_next_assessor(text) returns uuid`.
- Recriar `public.auto_assign_lead` para reusar `pick_next_assessor`.
- Recriar `public.sync_meta_lead_to_crm` adicionando reatribuição no merge.
- 1 UPDATE pontual no lead Bruno Velloso (apenas `responsavel_id`).

## Validação pós-aplicação

- Conferir `SELECT responsavel_id FROM leads WHERE id = '832d135e-...'` → não nulo.
- Conferir `auto_assign_state` da faixa `ate_10k` avançou em 1.
