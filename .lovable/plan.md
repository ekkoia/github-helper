
# Mapear Valor de Investimento para o Campo Numérico

## Problema Identificado

O campo `valor_investimento` da tabela `leadsNativo_feeagro` contém valores textuais que não estão sendo mapeados para o campo numérico `valor_produto` na tabela `leads`.

**Valores encontrados:**
- "até R$10 mil" → 10.000
- "de R$10 mil a R$50 mil" → 30.000 (valor médio)
- "de R$50 mil a R$100 mil" → 75.000 (valor médio)
- "acima de R$100 mil" → 100.000 (valor mínimo)

## Solução

Atualizar a função `sync_meta_lead_to_crm()` para converter o texto em valor numérico e popular o campo `valor_produto`.

## Alterações Necessárias

### 1. Atualizar a função de sincronização

```sql
CREATE OR REPLACE FUNCTION public.sync_meta_lead_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_observacoes text;
  lead_valor_produto numeric;
BEGIN
  -- Converter valor_investimento para numérico
  CASE NEW.valor_investimento
    WHEN 'até R$10 mil' THEN lead_valor_produto := 10000;
    WHEN 'de R$10 mil a R$50 mil' THEN lead_valor_produto := 30000;
    WHEN 'de R$50 mil a R$100 mil' THEN lead_valor_produto := 75000;
    WHEN 'acima de R$100 mil' THEN lead_valor_produto := 100000;
    ELSE lead_valor_produto := NULL;
  END CASE;

  -- Construir observações com informações do anúncio
  lead_observacoes := 'Valor pretendido: ' || COALESCE(NEW.valor_investimento, 'Não informado');
  
  -- ... resto da lógica ...

  INSERT INTO public.leads (
    nome_completo,
    telefone,
    email,
    origem,
    etapa_funil,
    observacoes,
    valor_produto,  -- NOVO: agora inclui o valor numérico
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
    lead_valor_produto,  -- NOVO
    NEW.id,
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (meta_lead_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
```

### 2. Atualizar leads já sincronizados

```sql
UPDATE public.leads
SET valor_produto = CASE
    WHEN observacoes LIKE '%até R$10 mil%' THEN 10000
    WHEN observacoes LIKE '%de R$10 mil a R$50 mil%' THEN 30000
    WHEN observacoes LIKE '%de R$50 mil a R$100 mil%' THEN 75000
    WHEN observacoes LIKE '%acima de R$100 mil%' THEN 100000
    ELSE valor_produto
  END
WHERE origem = 'meta_form' AND valor_produto IS NULL;
```

## Mapeamento de Valores

| Texto Original | Valor Numérico | Lógica |
|----------------|----------------|--------|
| até R$10 mil | R$ 10.000 | Valor máximo da faixa |
| de R$10 mil a R$50 mil | R$ 30.000 | Valor médio da faixa |
| de R$50 mil a R$100 mil | R$ 75.000 | Valor médio da faixa |
| acima de R$100 mil | R$ 100.000 | Valor mínimo da faixa |

## Impacto no Dashboard

Após a atualização, os 74 leads sincronizados terão o campo "Valor Investido" preenchido, permitindo:
- Visualização na coluna da tabela
- Cálculo correto de métricas de valor total
- Filtros e ordenação por valor

## Resumo das Alterações

| Recurso | Alteração |
|---------|-----------|
| Migração SQL | Atualizar função do trigger + atualizar leads existentes |
