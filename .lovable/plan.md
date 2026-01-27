
# Sincronização de Leads do Formulário Nativo Meta

## Objetivo

Sincronizar automaticamente todos os leads da tabela `leadsNativo_feeagro` para a tabela principal `leads` do CRM, com origem definida como "Formulário Nativo Meta" (`meta_form`).

## Mapeamento de Campos

| leadsNativo_feeagro | leads | Observações |
|---------------------|-------|-------------|
| `id` | `meta_lead_id` (novo) | Referência para evitar duplicatas |
| `nome_completo` | `nome_completo` | Campo obrigatório |
| `telefone` | `telefone` | Manter formato original |
| `email` | `email` | Manter formato original |
| `valor_investimento` | `observacoes` | Texto descritivo (ex: "até R$10 mil") |
| `created_at` | `data_criacao` | Preservar data original |
| - | `origem` | Sempre `meta_form` |
| - | `etapa_funil` | Sempre `Novo Lead` |
| `form_name`, `ad_name`, `adset_name` | `observacoes` | Concatenar informações do anúncio |

## Estratégia de Sincronização

### Opção Escolhida: Trigger no Banco de Dados

Usar um trigger que dispara automaticamente quando um novo registro é inserido na tabela `leadsNativo_feeagro`, criando o lead correspondente na tabela `leads`.

**Vantagens:**
- Sincronização em tempo real
- Não requer código adicional no frontend
- Funciona independente de como o lead chegou à tabela

## Alterações Necessárias

### 1. Migração SQL - Adicionar coluna de referência

Adicionar coluna `meta_lead_id` na tabela `leads` para armazenar o ID original e evitar duplicatas.

```sql
ALTER TABLE leads 
ADD COLUMN meta_lead_id bigint UNIQUE;
```

### 2. Migração SQL - Criar função de sincronização

```sql
CREATE OR REPLACE FUNCTION sync_meta_lead_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lead_observacoes text;
BEGIN
  -- Construir observações com informações do anúncio
  lead_observacoes := 'Valor pretendido: ' || COALESCE(NEW.valor_investimento, 'Não informado');
  
  IF NEW.form_name IS NOT NULL THEN
    lead_observacoes := lead_observacoes || chr(10) || 'Formulário: ' || NEW.form_name;
  END IF;
  
  IF NEW.ad_name IS NOT NULL THEN
    lead_observacoes := lead_observacoes || chr(10) || 'Anúncio: ' || NEW.ad_name;
  END IF;
  
  IF NEW.adset_name IS NOT NULL THEN
    lead_observacoes := lead_observacoes || chr(10) || 'Conjunto: ' || NEW.adset_name;
  END IF;

  -- Inserir na tabela leads
  INSERT INTO public.leads (
    nome_completo,
    telefone,
    email,
    origem,
    etapa_funil,
    observacoes,
    meta_lead_id,
    data_criacao
  )
  VALUES (
    COALESCE(NEW.nome_completo, 'Não informado'),
    NEW.telefone,
    NEW.email,
    'meta_form',
    'Novo Lead',
    lead_observacoes,
    NEW.id,
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (meta_lead_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
```

### 3. Migração SQL - Criar trigger

```sql
CREATE TRIGGER trigger_sync_meta_lead
AFTER INSERT ON "leadsNativo_feeagro"
FOR EACH ROW
EXECUTE FUNCTION sync_meta_lead_to_crm();
```

### 4. Migração SQL - Sincronizar leads existentes

```sql
INSERT INTO public.leads (
  nome_completo,
  telefone,
  email,
  origem,
  etapa_funil,
  observacoes,
  meta_lead_id,
  data_criacao
)
SELECT
  COALESCE(nome_completo, 'Não informado'),
  telefone,
  email,
  'meta_form',
  'Novo Lead',
  'Valor pretendido: ' || COALESCE(valor_investimento, 'Não informado') ||
    CASE WHEN form_name IS NOT NULL THEN chr(10) || 'Formulário: ' || form_name ELSE '' END ||
    CASE WHEN ad_name IS NOT NULL THEN chr(10) || 'Anúncio: ' || ad_name ELSE '' END ||
    CASE WHEN adset_name IS NOT NULL THEN chr(10) || 'Conjunto: ' || adset_name ELSE '' END,
  id,
  COALESCE(created_at, now())
FROM "leadsNativo_feeagro"
WHERE id NOT IN (SELECT meta_lead_id FROM leads WHERE meta_lead_id IS NOT NULL);
```

### 5. Atualizar tipos TypeScript

Atualizar `src/integrations/supabase/types.ts` para incluir o novo campo `meta_lead_id`.

## Fluxo de Sincronização

```text
┌────────────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ leadsNativo_feeagro    │────▶│   Trigger    │────▶│     leads       │
│ (Formulário Meta)      │     │    (auto)    │     │ (CRM principal) │
└────────────────────────┘     └──────────────┘     └─────────────────┘
                                                            │
                                                            ▼
                                                    ┌───────────────┐
                                                    │   Dashboard   │
                                                    │   (métricas)  │
                                                    └───────────────┘
```

## Impacto no Dashboard

Após a sincronização, os 74 leads existentes aparecerão automaticamente no dashboard com:

- **Origem**: "Formulário Nativo Meta" 
- **Etapa**: "Novo Lead"
- **Observações**: Valor pretendido + informações do anúncio
- **Data de criação**: Preservada da tabela original

As métricas serão atualizadas automaticamente pois consultam a tabela `leads`.

## Resumo das Alterações

| Arquivo/Recurso | Alteração |
|-----------------|-----------|
| Nova migração SQL | Adicionar coluna `meta_lead_id`, função e trigger |
| `types.ts` | Incluir campo `meta_lead_id` no tipo `leads` |

