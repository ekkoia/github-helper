

# Cards do Kanban mais estreitos e centralizados no mobile

## O que sera feito

Aumentar o padding interno do scroll container e reduzir a largura das colunas para que os cards aparecam por completo e centralizados na tela do celular.

## Alteracao unica

### Arquivo: `src/pages/Kanban.tsx`

**Scroll container** (linha 274):
- Trocar `px-2` por `px-4` para dar mais espaco nas laterais

**Colunas** (linha 284):
- Trocar `min-w-[calc(100vw-1rem)]` por `min-w-[calc(100vw-2.5rem)]`
- O calculo: `-mx-4` expande o container, `px-4` (16px cada lado = 32px) mais 8px de respiro = 40px = 2.5rem
- Isso garante que o card inteiro fique visivel com margem confortavel dos dois lados

## Resultado esperado

Os cards ficarao visivelmente mais estreitos, com margem igual nas duas laterais, aparecendo por completo sem nenhum corte.
