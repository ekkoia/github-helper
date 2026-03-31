

# Mostrar eventos dos dias adjacentes visíveis no calendário

## Problema
O calendário mostra dias de meses adjacentes (ex: 1-4 de abril quando vendo março), mas o hook só busca eventos entre `startOfMonth` e `endOfMonth` do mês atual. Eventos nesses dias de overflow não aparecem.

## Solução

### `src/hooks/useAgendaEvents.ts`

Alterar o cálculo do range de busca (linhas 45-46) para usar `startOfWeek(startOfMonth(...))` e `endOfWeek(endOfMonth(...))` — espelhando exatamente a lógica do calendário:

```typescript
const start = startOfWeek(startOfMonth(currentMonth), { locale: ptBR }).toISOString();
const end = endOfWeek(endOfMonth(currentMonth), { locale: ptBR }).toISOString();
```

Adicionar imports de `startOfWeek`, `endOfWeek` e `ptBR` no hook.

Apenas 1 arquivo alterado, 3 linhas modificadas.

