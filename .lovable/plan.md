

# Corrigir parsing de created_time_brasil no Dashboard

## Problema

A migracao corrigiu os dados no banco com sucesso -- os valores de `created_time_brasil` estao corretos (ex: `2026-02-14 22:26:00+00`). Porem o formato mudou: o `TO_TIMESTAMP(...)::text` gera datas com espaco em vez de `T` como separador.

O codigo JavaScript faz `split('T')[0]`, que nao encontra o `T`, retorna a string inteira (`2026-02-14 22:26:00+00`), e gera uma data invalida com `new Date(...)`. Isso faz os leads sumirem dos graficos.

## Solucao

Atualizar a funcao `getLeadDate` em **dois arquivos** para aceitar ambos os formatos (com `T` e com espaco):

### Arquivos a modificar

1. **`src/components/DashboardCharts.tsx`** (linha 57)
2. **`src/pages/Dashboard.tsx`** (se tiver logica similar)

### Mudanca

Trocar:
```
const dateStr = lead.created_time_brasil.split('T')[0];
```

Por:
```
const dateStr = lead.created_time_brasil.substring(0, 10);
```

Isso extrai sempre os primeiros 10 caracteres (`2026-02-14`), independente do separador ser `T` ou espaco. Funciona para ambos os formatos:
- `2026-02-14T22:26:00` (formato ISO antigo)
- `2026-02-14 22:26:00+00` (formato novo do TO_TIMESTAMP::text)

### Nenhuma outra mudanca necessaria

Os dados no banco estao corretos. Apenas o parsing no frontend precisa ser ajustado.

