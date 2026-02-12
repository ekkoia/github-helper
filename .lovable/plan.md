

# Ajustar largura dos cards do Kanban no mobile

## Problema
No mobile, as colunas do Kanban tem largura minima de 280px (`min-w-[280px]`), o que faz os cards ficarem cortados na lateral direita da tela.

## Solucao
Reduzir a largura minima das colunas no mobile para que caibam na tela sem corte. A coluna deve ocupar a largura disponivel da tela no mobile em vez de usar um valor fixo largo.

## Detalhes Tecnicos

### Arquivo modificado: `src/pages/Kanban.tsx`

- Alterar a classe da coluna de `min-w-[280px] md:min-w-[320px]` para `min-w-[calc(100vw-4rem)] md:min-w-[320px]`
- Isso faz com que no mobile a coluna ocupe a largura da viewport menos o padding lateral, garantindo que o card apareca inteiro
- No desktop (md+), mantem o comportamento atual de 320px

