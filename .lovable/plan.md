

# Abreviar nomes dos assessores nos gráficos

## Problema
Nomes completos longos (ex: "Adolfo Felipe Saavedra Alegria") ficam extensos no eixo X dos gráficos.

## Solução

### `src/components/equipe/EquipeCharts.tsx`

Alterar o `assessorNames` useMemo (~linha 37) para:

1. Coletar todos os nomes completos com seus IDs
2. Para cada nome, extrair "Primeiro Segundo" (2 primeiras palavras)
3. Se houver colisão (dois assessores com mesmo "Primeiro Segundo"), usar "Primeiro Terceiro" para ambos (se terceiro nome existir), senão manter o original
4. Retornar o mapa `id → nome abreviado`

```typescript
const assessorNames = useMemo(() => {
  // 1. Coletar nomes completos
  const fullNames: Record<string, string> = {};
  leads.forEach(l => {
    if (l.responsavel_id && !fullNames[l.responsavel_id]) {
      fullNames[l.responsavel_id] = usersMap[l.responsavel_id]?.nome_completo || "Desconhecido";
    }
  });

  // 2. Gerar nomes curtos (primeiro + segundo)
  const shortName = (full: string) => {
    const parts = full.split(/\s+/);
    return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : full;
  };

  // 3. Detectar colisões e resolver com terceiro nome
  const shorts: Record<string, string[]> = {}; // shortName → [ids]
  const idToShort: Record<string, string> = {};
  
  Object.entries(fullNames).forEach(([id, full]) => {
    const s = shortName(full);
    idToShort[id] = s;
    if (!shorts[s]) shorts[s] = [];
    shorts[s].push(id);
  });

  const result: Record<string, string> = {};
  Object.entries(fullNames).forEach(([id, full]) => {
    const s = idToShort[id];
    if (shorts[s].length > 1) {
      // Colisão — usar primeiro + terceiro nome (se existir)
      const parts = full.split(/\s+/);
      result[id] = parts.length >= 3 ? `${parts[0]} ${parts[2]}` : full;
    } else {
      result[id] = s;
    }
  });

  return result;
}, [leads, usersMap]);
```

Alteração apenas no `assessorNames` useMemo. Todos os gráficos já consomem esse mapa, então a mudança se propaga automaticamente.

