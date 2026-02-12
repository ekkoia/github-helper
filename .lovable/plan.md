

# Centralizar cards do Kanban no mobile - solucao definitiva

## Causa raiz real

O `overflow-x-hidden` presente no Layout (tanto no `main` quanto no container pai) impede que margens negativas (`-mx-4`) expandam o elemento. O lado direito e cortado silenciosamente. Por isso, todas as tentativas anteriores com `-mx-4` falharam.

## Estrategia: eliminar margens negativas

Em vez de lutar contra o overflow, vamos usar a mesma abordagem simples do Dashboard: deixar o padding do wrapper e do main trabalharem juntos naturalmente.

## Alteracoes

### 1. `src/pages/Leads.tsx` (linha 23)

Remover o condicional `px-0` para kanban. Usar `px-4` sempre, igual ao Dashboard:

```
// De:
className={cn("w-full max-w-[1400px] mx-auto", activeTab === "kanban" ? "px-0 md:px-4" : "px-4")}

// Para:
className="w-full max-w-[1400px] mx-auto px-4"
```

### 2. `src/pages/Kanban.tsx` (scroll container, linha 274)

Remover margens negativas e padding compensatorio. O scroll so precisa de overflow-x:

```
// De:
className="overflow-x-auto -mx-4 md:mx-0 px-8 md:px-0"

// Para:
className="overflow-x-auto"
```

### 3. `src/pages/Kanban.tsx` (colunas, linha 284)

Ajustar a largura das colunas para o novo espaco disponivel. Com `main p-4` (16px) + wrapper `px-4` (16px) = 32px de cada lado = 64px total = 4rem:

```
// De:
className="min-w-[calc(100vw-4rem)] md:min-w-[320px] flex-shrink-0 snap-start"

// Para:
className="min-w-[calc(100vw-4rem)] md:min-w-[320px] flex-shrink-0 snap-start"
```

A largura da coluna ja esta correta em `calc(100vw-4rem)`, pois 4rem = 64px = os 32px de margem de cada lado.

## Resumo das mudancas

Apenas 2 linhas mudam de fato:

1. **Leads.tsx**: remover condicional de padding, usar `px-4` sempre
2. **Kanban.tsx**: remover `-mx-4 md:mx-0 px-8 md:px-0` do scroll container, deixar apenas `overflow-x-auto`

## Por que funciona

Mesma logica do Dashboard: `main p-4` + wrapper `px-4` = 32px de margem de cada lado. Sem margens negativas, sem conflito com `overflow-x-hidden`. Simples e identico ao Dashboard.
