
# Desduplicacao de Leads por Email/Telefone

## Problema identificado

O sistema cria registros duplicados quando o mesmo contato chega por origens diferentes (meta_form, whatsapp, webhook). Cada registro passa pelo round-robin independentemente, resultando em assessores diferentes para a mesma pessoa.

**Dados concretos**: 567 leads no total, mas apenas 543 emails unicos = **24 leads duplicados**.

Exemplos encontrados:
- `il9374138@icloud.com` (Ivan Luiz): meta_form -> Ana Carolina, whatsapp -> Jose Vitor
- `mauromontilla33@gmail.com` (Mauro): 3 registros, 2 assessores diferentes
- `nonatocardoso478@gmail.com` (Nonato): 3 registros, assessores diferentes

## Solucao em duas camadas

### Camada 1: Trigger de banco de dados (auto_assign_lead)

Alterar a funcao `auto_assign_lead` para, antes de atribuir pelo round-robin, verificar se ja existe um lead com o mesmo email ou telefone. Se existir e tiver responsavel, copiar o `responsavel_id` do lead existente em vez de girar o round-robin.

**Logica**:
1. Se `NEW.responsavel_id` ja esta preenchido, retorna (comportamento atual)
2. Buscar lead existente com mesmo email ou telefone (normalizado) que tenha `responsavel_id` preenchido
3. Se encontrou, usar o `responsavel_id` do lead existente
4. Se nao encontrou, seguir com o round-robin normal

### Camada 2: Edge Function webhook-lead

Alterar o `webhook-lead` para verificar se ja existe um lead com o mesmo email antes de inserir. Se existir:
- Atualizar o lead existente com os dados novos (merge), adicionando observacoes
- Retornar os dados do lead existente (incluindo responsavel e dados Callix)
- Nao criar registro duplicado

### Camada 3: Limpeza dos duplicados existentes

Criar uma migration que:
1. Para cada email com mais de um lead, manter o mais antigo (primeiro registro)
2. Copiar observacoes relevantes dos duplicados para o registro original
3. Remover os duplicados

## Detalhes tecnicos

### Migration SQL - Alterar auto_assign_lead

```sql
CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faixa text;
  v_last_order integer;
  v_next_user_id uuid;
  v_next_order integer;
  v_config_count integer;
  v_existing_responsavel uuid;
BEGIN
  -- Se ja tem responsavel, nao faz nada
  IF NEW.responsavel_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- DESDUPLICACAO: buscar responsavel de lead existente com mesmo email ou telefone
  SELECT responsavel_id INTO v_existing_responsavel
  FROM leads
  WHERE responsavel_id IS NOT NULL
    AND (
      (NEW.email IS NOT NULL AND NEW.email != '' AND lower(trim(email)) = lower(trim(NEW.email)))
      OR
      (NEW.telefone IS NOT NULL AND NEW.telefone != '' AND regexp_replace(telefone, '[^0-9]', '', 'g') = regexp_replace(NEW.telefone, '[^0-9]', '', 'g'))
    )
  ORDER BY data_criacao ASC
  LIMIT 1;

  IF v_existing_responsavel IS NOT NULL THEN
    NEW.responsavel_id := v_existing_responsavel;
    RETURN NEW;  -- Pula o round-robin
  END IF;

  -- Round-robin normal (codigo existente)
  ...
END;
$$;
```

### Alteracao no webhook-lead (Edge Function)

Antes do INSERT, fazer um SELECT para verificar se o lead ja existe:

```typescript
// Buscar lead existente pelo email ou telefone
const { data: existingLead } = await supabase
  .from('leads')
  .select('id, responsavel_id, nome_completo, protocolo_atendimento, observacoes')
  .or(`email.eq.${email},telefone.eq.${telefone}`)
  .order('data_criacao', { ascending: true })
  .limit(1)
  .maybeSingle();

if (existingLead) {
  // Atualizar lead existente com dados novos (merge)
  // Adicionar origem nas observacoes
  // Retornar dados do lead existente com responsavel e callix
}
```

### Migration de limpeza dos duplicados atuais

Sera necessario rodar manualmente uma query para consolidar os 24 leads duplicados existentes, mantendo o registro mais antigo e reatribuindo ao assessor correto.

## Arquivos modificados

1. **Nova migration SQL**: Alterar funcao `auto_assign_lead` com logica de desduplicacao
2. **`supabase/functions/webhook-lead/index.ts`**: Adicionar verificacao de lead existente antes de inserir
3. **Nova migration SQL**: Limpeza dos duplicados existentes

## Resultado esperado

- Leads que chegam por qualquer origem com mesmo email/telefone serao sempre atribuidos ao mesmo assessor
- O webhook-lead atualiza o lead existente em vez de criar duplicata
- O trigger `auto_assign_lead` funciona como rede de seguranca para qualquer ponto de insercao
- Os 24 duplicados existentes serao consolidados
