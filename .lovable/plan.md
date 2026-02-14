

# Indicador Visual de Multiplas Origens

## O que sera feito

Adicionar rastreamento de todas as origens por onde um lead interagiu e mostrar isso visualmente tanto na tabela quanto no modal de detalhes. Assim o time sabera que o Ivan Luiz, por exemplo, veio pelo Meta Form **e** pelo WhatsApp.

## Como funciona hoje

- O campo `origem` na tabela `leads` armazena apenas **um valor** (ex: `meta_form`)
- Quando a desduplicacao faz merge, a origem e sobrescrita pela mais recente
- Nao ha como saber que o lead interagiu com multiplas campanhas/fontes

## Solucao

### 1. Nova coluna no banco de dados

Adicionar uma coluna `origens` (tipo `jsonb`, array de strings) na tabela `leads` para armazenar todas as origens pelas quais o lead entrou.

Exemplo: `["meta_form", "whatsapp"]`

### 2. Atualizar triggers e Edge Function

- **Trigger `auto_assign_lead`**: quando um novo lead e inserido, inicializar `origens` com `[origem]`
- **Trigger `sync_meta_lead_to_crm`**: ao fazer merge, adicionar `"meta_form"` ao array se ainda nao existir
- **Edge Function `webhook-lead`**: ao fazer merge, adicionar a nova origem ao array existente

### 3. Indicador visual na tabela (LeadsTable)

Na coluna "Origem", quando o lead tiver mais de uma origem:
- Mostrar a origem principal com um badge
- Adicionar um indicador "+N" ao lado (ex: "Meta Form +1") com tooltip listando todas as origens
- Cor diferenciada para leads multi-origem (destaque visual sutil)

### 4. Secao no modal de detalhes (LeadDetailsModal)

Dentro da secao "Negociacao", substituir o campo simples de "Origem" por uma lista de badges mostrando todas as origens. Se o lead tiver mais de uma, mostrar um destaque com icone indicando "Lead multi-origem".

### 5. Migrar dados existentes

Para leads que ja sofreram desduplicacao (observacoes contem "[Desduplicacao automatica]"), popular o campo `origens` analisando o conteudo das observacoes para extrair as origens mencionadas.

---

## Detalhes tecnicos

### Migration SQL

```sql
-- Adicionar coluna origens
ALTER TABLE leads ADD COLUMN origens jsonb DEFAULT '[]'::jsonb;

-- Trigger para inicializar origens em novos leads
CREATE OR REPLACE FUNCTION init_lead_origens()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.origens IS NULL OR NEW.origens = '[]'::jsonb THEN
    IF NEW.origem IS NOT NULL AND NEW.origem != '' THEN
      NEW.origens := jsonb_build_array(NEW.origem);
    ELSE
      NEW.origens := '[]'::jsonb;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_init_origens
BEFORE INSERT ON leads
FOR EACH ROW EXECUTE FUNCTION init_lead_origens();

-- Migrar dados existentes
UPDATE leads SET origens = jsonb_build_array(origem)
WHERE origem IS NOT NULL AND origem != ''
  AND (origens IS NULL OR origens = '[]'::jsonb);
```

### Arquivos modificados

1. **Nova migration SQL** - coluna `origens`, trigger de inicializacao e migracao de dados existentes
2. **`supabase/functions/webhook-lead/index.ts`** - ao fazer merge, adicionar origem ao array `origens`
3. **`src/pages/LeadsTable.tsx`** - indicador visual multi-origem na coluna Origem
4. **`src/components/LeadDetailsModal.tsx`** - secao expandida com todas as origens
5. **`src/integrations/supabase/types.ts`** - adicionar campo `origens` ao tipo
6. **Trigger `sync_meta_lead_to_crm`** (migration) - adicionar origem ao array no merge

### Indicador visual na tabela

Para leads com uma unica origem: badge normal como hoje.

Para leads com multiplas origens: badge da origem principal + chip "+N" em cor de destaque. Ao passar o mouse (tooltip), mostra a lista completa de origens.

### Secao no modal de detalhes

Dentro de "Negociacao", o campo "Origem" mostrara:
- Uma lista de badges com todas as origens
- Um banner informativo sutil quando houver mais de uma origem: "Este lead interagiu por N canais diferentes"
