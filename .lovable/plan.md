

# Correcao FINAL do Kanban mobile - abordagem CSS pura com margem negativa

## Por que as tentativas anteriores falharam

Todas as abordagens anteriores dependiam de calcular a largura disponivel de forma indireta (`100vw - Xrem` ou ResizeObserver + `isMobile`). O problema real e que o Kanban esta dentro de um `main` com `p-4` (16px cada lado) e `overflow-x-hidden`, que **corta** qualquer conteudo que ultrapasse seus limites. Nenhum calculo de largura resolve se o conteudo e cortado pelo pai.

## Solucao: margem negativa para escapar do padding do pai

A tecnica e simples e usada amplamente em CSS: aplicar `-mx-4` no scroll container para **cancelar** o padding do `main`, fazendo o container de scroll ocupar toda a largura disponivel. Depois, adicionar um pequeno padding interno (`px-2`) para dar respiro visual.

## Alteracoes

### 1. `src/pages/Kanban.tsx`

**Scroll container** (linha 287-291):
- Adicionar `-mx-4 md:mx-0 px-2 md:px-0` ao className
- Isso faz o scroll container "escapar" do padding do main no mobile

**Colunas** (linha 297-300):
- Remover o ResizeObserver, o estado `columnWidth` e a importacao `useIsMobile`
- Trocar o style inline por classe CSS simples: `min-w-[calc(100vw-1rem)] md:min-w-[320px]`
- Com a margem negativa, `100vw` agora corresponde ao espaco real, e `1rem` (16px) e o padding interno do scroll container (8px cada lado)

**Remover codigo desnecessario**:
- Estado `columnWidth` e `isMobile`
- useEffect do ResizeObserver (linhas 135-147)
- Import de `useIsMobile`

### 2. Nenhuma alteracao em `src/pages/Leads.tsx`
O `px-0 md:px-4` ja aplicado continua correto.

## Por que esta solucao funciona

- Margem negativa e uma tecnica CSS padrao e confiavel, sem depender de JavaScript
- O `-mx-4` cancela exatamente o `p-4` do `main`, dando ao scroll container a largura total
- O `overflow-x-auto` do scroll container funciona normalmente porque ele agora tem a largura correta
- `calc(100vw - 1rem)` e preciso porque so precisa compensar o `px-2` (padding proprio do scroll container)
- Funciona em qualquer viewport, iframe, ou contexto de navegador

