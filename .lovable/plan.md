

# Centralizar cards do Kanban como os do Dashboard no mobile

## Problema atual

No Dashboard, os cards possuem 32px de margem em cada lado (16px do `main p-4` + 16px do wrapper `px-4`). No Kanban, o `-mx-4` cancela o padding do `main` e o `px-4` adiciona apenas 16px de cada lado, resultando em cards quase colados nas bordas.

## Solucao

### Arquivo: `src/pages/Kanban.tsx`

**Scroll container** (linha 274):
- Trocar `px-4` por `px-8` para ter 32px de padding em cada lado, igualando o Dashboard

**Colunas** (linha 284):
- Trocar `min-w-[calc(100vw-2.5rem)]` por `min-w-[calc(100vw-4rem)]`
- Calculo: `px-8` = 32px cada lado = 64px total = 4rem

## Por que funciona

O Dashboard tem 32px de margem horizontal em cada lado no mobile (main `p-4` + wrapper `px-4`). Com esta alteracao, o Kanban tera exatamente a mesma margem, fazendo os cards ficarem centralizados e com o mesmo respiro visual do Dashboard.
