
# Cards do Kanban mais estreitos e centralizados no mobile

## O que esta errado

O problema nunca foi a posicao da coluna. O problema sao os **cards individuais** dentro da coluna - eles esticam de ponta a ponta, ocupando 100% da largura da coluna. Isso faz os cards parecerem enormes e amadores no mobile.

## O que precisa mudar

Aumentar o padding interno da area dos cards dentro de cada coluna, para que os cards fiquem mais estreitos e com respiro visual, exatamente como os cards do Dashboard.

## Alteracoes

### Arquivo: `src/pages/Kanban.tsx`

**1. Padding interno da area de cards (linha 307)**

Aumentar o padding horizontal da div que contem os cards de `p-3` (12px) para `px-5 py-3` (20px horizontal, 12px vertical). Isso faz cada card ficar 40px mais estreito (20px de cada lado), criando o respiro visual que falta.

```
// De:
<div className="space-y-3 p-3 min-h-[100px]">

// Para:
<div className="space-y-3 px-5 py-3 min-h-[100px]">
```

**2. Largura da coluna mobile (linha 284)**

Reduzir de `82vw` para `78vw` para que a coluna caiba melhor na tela com margens visiveis em ambos os lados:

```
// De:
className="min-w-[82vw] md:min-w-[320px] flex-shrink-0 snap-start"

// Para:
className="min-w-[78vw] md:min-w-[320px] flex-shrink-0 snap-start"
```

## Resultado esperado

- Coluna ocupa 78% da tela no mobile (~304px em tela de 390px)
- Cards tem 20px de margem interna de cada lado dentro da coluna
- Cards ficam com ~264px de largura, visivelmente mais estreitos e centralizados
- Visual limpo e profissional, compativel com o padrao do Dashboard
