
# Corrigir Problemas na Página de Atividades

## Problemas Identificados

### 1. Iniciais mostrando texto estranho ("JDEFIN")
O nome "Juliana Nascimento " está salvo com espaço extra no final. Quando a função `split(" ")` é executada, gera um array com string vazia no final, causando o erro.

### 2. Atividades não aparecem em tempo real
A página carrega as atividades apenas uma vez. Não há atualização automática ou em tempo real.

## Alterações Propostas

### Arquivo: `src/components/atividades/AtividadesLista.tsx`

**Corrigir função `getInitials`:**

```typescript
const getInitials = (name: string) => {
  if (!name) return "?";
  // Remover espaços extras e filtrar elementos vazios
  const names = name.trim().split(" ").filter(n => n.length > 0);
  if (names.length >= 2) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  if (names.length === 1 && names[0].length >= 2) {
    return names[0].slice(0, 2).toUpperCase();
  }
  return "?";
};
```

### Arquivo: `src/pages/Atividades.tsx`

**Adicionar atualização em tempo real com Supabase Realtime:**

```typescript
// Adicionar subscription para atualização em tempo real
useEffect(() => {
  if (!roleLoading && canAccess) {
    fetchActivities();

    // Subscrição para atualizações em tempo real
    const channel = supabase
      .channel('user_activities_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activities'
        },
        () => {
          fetchActivities(); // Recarregar quando houver nova atividade
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}, [roleLoading, canAccess]);
```

**Adicionar botão de atualização manual:**

```typescript
<Button 
  variant="outline" 
  size="sm"
  onClick={fetchActivities}
  disabled={isLoading}
>
  <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
  Atualizar
</Button>
```

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/atividades/AtividadesLista.tsx` | Corrigir função `getInitials` para usar `trim()` e `filter()` |
| `src/pages/Atividades.tsx` | Adicionar Supabase Realtime subscription para atualizações automáticas |
| `src/pages/Atividades.tsx` | Adicionar botão "Atualizar" manual |
| `src/pages/Atividades.tsx` | Importar `RefreshCw` do lucide-react |

## Resultado Esperado

- **Iniciais corretas**: "JN" para Juliana Nascimento
- **Atividades em tempo real**: Novos logins/logouts aparecem automaticamente
- **Controle manual**: Botão para forçar atualização se necessário
