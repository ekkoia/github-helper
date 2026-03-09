

# Ajuste de responsividade da paginação para tablet

## Problema

No tablet (~768-1024px), o breakpoint `md:flex-row` ativa o layout horizontal, mas com a sidebar aberta o espaço disponível é insuficiente para os botões numerados + texto, causando overflow cortado à direita (visível no screenshot: só aparece o botão "1" e "...").

## Solução

**Arquivo:** `src/pages/LeadsTable.tsx` (linhas 637-688)

1. **Subir o breakpoint de row layout** de `md:` para `lg:` — assim no tablet os controles continuam empilhados verticalmente (como no mobile), só passando para horizontal em telas maiores onde há espaço suficiente.

2. **Aplicar as mesmas mudanças** no texto "Página X de Y": `text-center lg:text-left`.

Mudança mínima: trocar `md:flex-row md:items-center md:justify-between` → `lg:flex-row lg:items-center lg:justify-between` e `md:text-left` → `lg:text-left`.

