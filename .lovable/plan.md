

# Bug: Paginação trava na página 6

## Problema identificado

A paginação da tabela de leads tem dois problemas:

1. **Controles soltos no final da página**: Os botões de paginação ficam no fluxo normal do conteúdo, abaixo da tabela. Quando o usuário rola até o final para clicar, a mudança de página causa re-render e o scroll fica perdido, tornando os botões inacessíveis.

2. **Sem scroll-to-top ao trocar de página**: Ao clicar em próxima/anterior, a tabela atualiza mas a posição do scroll permanece no final, causando confusão visual.

## Solução

### Alteração em `src/pages/LeadsTable.tsx`

1. **Fixar a paginação na base do container da tabela** -- mover os controles para dentro do card da tabela com `sticky bottom-0` e fundo sólido, garantindo que sempre fiquem visíveis.

2. **Adicionar scroll-to-top automático** ao mudar de página, usando `scrollIntoView` na referência da tabela.

3. **Melhorar navegação** -- além de prev/next, adicionar botões de página numerados (com elipses para muitas páginas), permitindo saltar diretamente para qualquer página.

### Estrutura resultante

```text
┌─────────────────────────────────┐
│  Tabela (overflow-x-auto)       │
│  ...linhas...                   │
│                                 │
├─────────────────────────────────┤
│  ◀ 1 2 3 ... 6 ... 50 51 ▶     │  ← sticky bottom, bg-card
│  Página 6 de 51                 │
└─────────────────────────────────┘
```

Alteração concentrada em um único arquivo, sem mudanças de banco de dados.

