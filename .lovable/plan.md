

# Ajuste de responsividade da paginação sticky no mobile

## Problema

No mobile, o container de paginação usa `flex items-center justify-between` em uma única linha, mas os botões numerados + texto "Página X de Y" não cabem na largura da tela, causando overflow e desalinhamento (como visto no screenshot).

## Solução

**Arquivo:** `src/pages/LeadsTable.tsx` (linhas 637-688)

Ajustar o layout da paginação para empilhar verticalmente no mobile:

1. **Container principal**: trocar de `flex items-center justify-between` para `flex flex-col gap-2 md:flex-row md:items-center md:justify-between`
2. **Texto "Página X de Y"**: centralizar no mobile com `text-center md:text-left`
3. **Botões numerados**: adicionar `flex-wrap justify-center` para quebrar linha quando necessário no mobile
4. **Botões de página**: reduzir `min-w-[36px]` para `min-w-[32px]` no mobile

Alteração concentrada em um único bloco de ~50 linhas, sem mudanças de lógica.

