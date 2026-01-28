
# Melhorar UX do Kanban - Drag & Drop e Altura das Colunas

## Problemas Identificados

### 1. Drag & Drop Limitado
O evento `onDrop` está apenas no wrapper da coluna, exigindo que o usuário arraste o card até o topo da coluna para soltar.

### 2. Colunas sem Limite de Altura
As colunas usam `min-h-[200px]` sem altura maxima, crescendo infinitamente e criando scroll vertical muito longo.

## Solucao Proposta

### Alteracao 1: Propagar eventos de Drop em toda a coluna

Adicionar `onDragOver` e `onDrop` no `CardContent` para que o drop funcione em qualquer lugar da coluna:

```typescript
// Antes - eventos apenas no wrapper
<div
  key={etapa}
  onDragOver={(e) => e.preventDefault()}
  onDrop={() => handleDrop(etapa)}
>
  <Card>
    <CardHeader>...</CardHeader>
    <CardContent>...</CardContent>
  </Card>
</div>

// Depois - eventos em toda a area clicavel
<div key={etapa}>
  <Card>
    <CardHeader 
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => handleDrop(etapa)}
    >...</CardHeader>
    <CardContent 
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => handleDrop(etapa)}
    >...</CardContent>
  </Card>
</div>
```

### Alteracao 2: Limitar altura das colunas com ScrollArea

Usar o componente `ScrollArea` para criar scroll interno nas colunas:

```typescript
import { ScrollArea } from "@/components/ui/scroll-area";

// Estrutura da coluna com altura limitada
<Card className="flex flex-col h-[calc(100vh-280px)]">
  <CardHeader>...</CardHeader>
  <ScrollArea className="flex-1">
    <div className="space-y-3 p-3">
      {/* Cards dos leads */}
    </div>
  </ScrollArea>
</Card>
```

## Diagrama da Nova Estrutura

```text
+------------------+
| Header (etapa)   | <- Drop zone
+------------------+
| ScrollArea       |
| +-------------+  |
| | Lead Card 1 |  | <- Drop zone
| +-------------+  |
| +-------------+  |
| | Lead Card 2 |  | <- Drop zone
| +-------------+  |
| | ...         |  |
| +-------------+  |
| | Lead Card N |  |
| +-------------+  |
+------------------+
  Scroll vertical
  interno limitado
```

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Kanban.tsx` | Adicionar ScrollArea, limitar altura, propagar eventos de drop |

## Beneficios

- **Drop em qualquer lugar**: Usuario pode soltar o card em qualquer ponto da coluna
- **Altura controlada**: Colunas nao crescem infinitamente, mantendo visualizacao das etapas do funil
- **Scroll suave**: ScrollArea do Radix proporciona scroll nativo e responsivo
- **Melhor UX mobile**: Colunas com altura fixa facilitam navegacao em dispositivos moveis
