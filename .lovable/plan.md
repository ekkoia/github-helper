

# Corrigir Rastreamento de Origens para Leads Desduplicados

## Problema

Leads como o Ivan Luiz (`il9374138@icloud.com`) interagiram por dois canais (Meta Form + WhatsApp), mas o array `origens` mostra apenas `["meta_form"]`. A migracaoo anterior populou `origens` apenas com o valor do campo `origem`, sem considerar que leads desduplicados tinham dados de outras fontes nas observacoes.

Existem pelo menos 13 leads nessa situacao -- com "INFORMACOES COMPLEMENTARES" nas observacoes (dados vindos do WhatsApp) mas sem `"whatsapp"` no array `origens`.

## Solucao

### 1. Migration para corrigir dados existentes

Rodar um UPDATE que identifica leads com dados do WhatsApp nas observacoes e adiciona `"whatsapp"` ao array `origens`:

- Leads com `origem = 'meta_form'` e observacoes contendo "INFORMACOES COMPLEMENTARES" (dados do chatbot WhatsApp) recebem `origens = '["meta_form", "whatsapp"]'`
- Leads com `origem = 'whatsapp'` e observacoes contendo dados de "Formulario" (dados do Meta Form) recebem `origens = '["whatsapp", "meta_form"]'`

### 2. Nenhuma alteracao no frontend

O codigo da tabela e do modal ja esta pronto para exibir multiplas origens (badges + indicador "+N"). So precisa que o dado esteja correto no banco.

## Detalhes tecnicos

### SQL da migration

```sql
-- Leads que vieram do meta_form mas tambem interagiram via WhatsApp
UPDATE leads
SET origens = '["meta_form", "whatsapp"]'::jsonb
WHERE origem = 'meta_form'
  AND observacoes LIKE '%INFORMAÇÕES COMPLEMENTARES%'
  AND NOT (origens @> '"whatsapp"'::jsonb);

-- Leads que vieram do whatsapp mas tambem preencheram formulario Meta
UPDATE leads
SET origens = '["whatsapp", "meta_form"]'::jsonb
WHERE origem = 'whatsapp'
  AND observacoes LIKE '%Formulário%'
  AND NOT (origens @> '"meta_form"'::jsonb);
```

### Resultado esperado

- Ivan Luiz passara de `["meta_form"]` para `["meta_form", "whatsapp"]`
- Na tabela de leads, aparecera o badge "Formulario Nativo Meta" com o indicador "+1" ao lado
- No modal de detalhes, aparecera o banner "Este lead interagiu por 2 canais diferentes" com dois badges
- Aproximadamente 13 leads serao corrigidos

### Arquivo modificado

1. **Nova migration SQL** -- apenas o UPDATE dos dados existentes

