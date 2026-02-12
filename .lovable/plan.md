
# Corrigir largura das colunas do Kanban no mobile

## Problema
A alteracao anterior (`min-w-[calc(100vw-4rem)]`) foi aplicada no codigo mas nao resolveu o corte dos cards. Isso acontece porque:
- O Kanban esta dentro de dois containers com padding (`Layout main p-4` + `Leads container px-4`)
- O `100vw` inclui a largura da scrollbar do navegador, causando overflow
- O container pai tem `overflow-x-hidden` que corta o conteudo visualmente

## Solucao
Duas alteracoes para garantir que os cards caibam no mobile:

### 1. `src/pages/Kanban.tsx`
- Trocar `min-w-[calc(100vw-4rem)]` por `min-w-[calc(100vw-6rem)]` para compensar todo o padding acumulado (Layout + Leads container + margem de seguranca)

### 2. `src/pages/Leads.tsx`
- No tab Kanban, remover o padding horizontal extra no mobile para dar mais espaco ao board
- Alterar o container para usar `px-0 md:px-4` quando no modo Kanban, ou aplicar margem negativa no Kanban para compensar o padding

## Abordagem final escolhida
A forma mais limpa: no `Kanban.tsx`, usar `min-w-[calc(100vw-6rem)]` que compensa os ~96px de padding total (32px Layout + 32px Leads + margem de seguranca). No desktop mantem `md:min-w-[320px]`.

## Arquivo modificado
- `src/pages/Kanban.tsx` (linha 282): trocar `min-w-[calc(100vw-4rem)]` por `min-w-[calc(100vw-6rem)]`
