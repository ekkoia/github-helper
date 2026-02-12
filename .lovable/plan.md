

# Correcao definitiva: largura das colunas do Kanban no mobile

## Diagnostico raiz

O problema persiste porque existem **3 camadas de restricao** que impedem o card de aparecer inteiro:

```text
Layout (overflow-x-hidden)
  main (p-4 = 16px cada lado, overflow-x-hidden)
    Leads div (max-w-[1400px], px-4 = 16px cada lado)
      Kanban div
        scroll container (overflow-x-auto)
          coluna (min-w-[calc(100vw-6rem)])  <-- valor relativo ao viewport, nao ao container real
```

O `100vw` mede a largura total da tela, mas o espaco real disponivel ja foi reduzido por 64px de padding (32px do Layout + 32px do Leads). Alem disso, os dois `overflow-x-hidden` nos pais cortam qualquer conteudo que ultrapasse, anulando o scroll horizontal.

## Solucao definitiva (duas alteracoes)

### 1. `src/pages/Leads.tsx` - Remover padding horizontal no mobile quando estiver no Kanban

Trocar o container fixo `px-4` por padding condicional: no mobile quando a aba ativa for "kanban", usar `px-0`; caso contrario, manter `px-4`.

Isso elimina 32px de restricao desnecessaria no mobile.

### 2. `src/pages/Kanban.tsx` - Usar largura que cabe no espaco real

Trocar `min-w-[calc(100vw-6rem)]` por `min-w-[calc(100vw-2.5rem)]` -- agora so precisa compensar o padding do Layout (p-4 = 2rem) mais uma pequena margem de seguranca (0.5rem).

Com a remocao do padding do Leads no mobile (passo 1), a conta fecha corretamente.

## Detalhes tecnicos

### `src/pages/Leads.tsx`
- Importar o estado `activeTab` ja existente
- Alterar a div container de `className="w-full max-w-[1400px] mx-auto px-4"` para `className={cn("w-full max-w-[1400px] mx-auto", activeTab === "kanban" ? "px-0 md:px-4" : "px-4")}`
- Importar `cn` de `@/lib/utils`

### `src/pages/Kanban.tsx`
- Alterar a classe da coluna de `min-w-[calc(100vw-6rem)]` para `min-w-[calc(100vw-2.5rem)]`

## Por que esta solucao e definitiva

- Elimina a fonte do problema (padding duplo desnecessario) em vez de tentar compensar com calculos cada vez maiores
- O padding do Leads so e removido no mobile e apenas na aba Kanban, sem afetar a tabela ou o desktop
- A conta `100vw - 2.5rem` agora corresponde ao espaco real disponivel (viewport menos padding do Layout)

