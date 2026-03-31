

# Trigger SQL para detectar mudança de etapa e cancelar alerta de 2h

## O que será feito

Criar um trigger SQL na tabela `leads` que, ao detectar que `etapa_funil` mudou de `'Lead novo!'` para qualquer outra etapa, automaticamente:
1. Marca `alerta_sem_contato_enviado = true` (cancela/previne o alerta de 2h)
2. Registra a data do primeiro contato em um novo campo `data_primeiro_contato`

## Alterações

### Migration SQL

```sql
-- Adicionar campo data_primeiro_contato
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_primeiro_contato timestamptz;

-- Criar função do trigger
CREATE OR REPLACE FUNCTION mark_lead_contacted_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.etapa_funil = 'Lead novo!' 
     AND NEW.etapa_funil IS DISTINCT FROM 'Lead novo!' THEN
    NEW.alerta_sem_contato_enviado := true;
    IF NEW.data_primeiro_contato IS NULL THEN
      NEW.data_primeiro_contato := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE UPDATE
CREATE TRIGGER trg_lead_contacted_on_stage_change
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION mark_lead_contacted_on_stage_change();
```

Nenhuma alteração de código frontend necessária — o trigger age automaticamente no banco.

## Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar coluna + função + trigger |

