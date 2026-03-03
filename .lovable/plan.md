

# Endpoint GET para consultar proximo assessor do round-robin

## Objetivo

Criar uma Edge Function que simula a logica do round-robin (sem avançar o ponteiro) e retorna os dados do assessor que seria atribuido ao proximo lead, incluindo os dados do mapeamento Callix.

## Como funciona

O endpoint recebe um parametro `faixa` via query string (`ate_10k` ou `acima_10k`) e:

1. Consulta a tabela `auto_assign_state` para obter o `last_assigned_order` da faixa
2. Consulta a tabela `auto_assign_config` para encontrar o proximo usuario ativo na fila (ordem > last_assigned_order, ou volta ao inicio)
3. Com o `user_id` encontrado, busca os dados na tabela `user_callix_mapping`
4. Retorna os dados combinados

## Resposta do endpoint

```text
GET /next-assessor?faixa=ate_10k

{
  "success": true,
  "data": {
    "user_id": "uuid-do-usuario",
    "faixa": "ate_10k",
    "callix_assessor_id": "123",
    "callix_name": "Nome do Assessor",
    "cal_event_type_id": "456",
    "callix_list_id": "789"
  }
}
```

Se nao houver assessores configurados para a faixa, retorna erro 404.

## Detalhes tecnicos

### 1. Criar Edge Function `next-assessor`

**Arquivo: `supabase/functions/next-assessor/index.ts`**

- Metodo: GET
- Query param obrigatorio: `faixa` (valores: `ate_10k` ou `acima_10k`)
- Autenticacao: via API key no header `x-api-key` (mesmo padrao do webhook-lead) para uso externo
- Usa `SUPABASE_SERVICE_ROLE_KEY` para acessar as tabelas sem restricao de RLS

Logica:
```text
1. Validar faixa
2. SELECT last_assigned_order FROM auto_assign_state WHERE faixa = ?
3. SELECT user_id, ordem FROM auto_assign_config 
   WHERE faixa = ? AND ativo = true AND ordem > last_assigned_order
   ORDER BY ordem ASC LIMIT 1
4. Se nao encontrou, buscar o primeiro (ordem ASC LIMIT 1)
5. SELECT callix_assessor_id, callix_name, cal_event_type_id, callix_list_id 
   FROM user_callix_mapping WHERE user_id = ?
6. Retornar dados combinados
```

### 2. Atualizar `supabase/config.toml`

Adicionar configuracao para desabilitar JWT verification:
```text
[functions.next-assessor]
verify_jwt = false
```

## Arquivos a criar/modificar

1. **Criar** `supabase/functions/next-assessor/index.ts` - Edge Function principal
2. **Modificar** `supabase/config.toml` - adicionar config da funcao

