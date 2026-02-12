

# Correção REAL do Kanban mobile - remover w-full do scroll container

## Causa raiz (encontrada agora)

Todas as tentativas anteriores aplicaram `-mx-4` no scroll container para cancelar o padding do `main`. Porém, o scroll container também tinha `w-full` (`width: 100%`). Em CSS, margens negativas so expandem a largura de um elemento quando a largura e `auto` (padrao de blocos). Com `width: 100%` explicitamente definido, as margens negativas apenas deslocam o elemento sem expandi-lo, causando o corte no lado direito.

## Solucao

Remover `w-full` do scroll container no Kanban. Elementos de bloco ja possuem `width: auto` por padrao, que e exatamente o comportamento necessario para que `-mx-4` funcione.

## Alteracao

### Arquivo: `src/pages/Kanban.tsx` (1 linha)

Scroll container (linha ~274):

**De:**
```
className="w-full overflow-x-auto -mx-4 md:mx-0 px-2 md:px-0"
```

**Para:**
```
className="overflow-x-auto -mx-4 md:mx-0 px-2 md:px-0"
```

Apenas remover `w-full`. Nada mais muda.

## Por que funciona

Com `width: auto` + `-mx-4`, o CSS calcula automaticamente:

```
margin-left(-16px) + padding(8px) + WIDTH + padding(8px) + margin-right(-16px) = parent content width
WIDTH = parent content width + 16px
```

O scroll container fica 16px mais largo que a area de conteudo do pai, cancelando efetivamente o padding do `main`. As colunas com `min-w-[calc(100vw-1rem)]` agora cabem perfeitamente porque o espaco real corresponde ao calculo.

## Nenhuma outra alteracao necessaria

- `Layout.tsx`: sem mudancas
- `Leads.tsx`: o `px-0 md:px-4` condicional continua correto
- Colunas: `min-w-[calc(100vw-1rem)]` continua correto

