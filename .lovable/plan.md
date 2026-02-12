

# Corrigir largura dos cards do Kanban no mobile - causa raiz encontrada

## Problema real identificado

O CSS usa `min-w-[78vw]` que define uma largura **minima**, nao uma largura **exata**. Isso significa que se qualquer conteudo interno (nome longo, texto sem quebra) for mais largo que 78vw, a coluna inteira se expande para acomodar, ficando maior que a tela. Por isso os cards aparecem cortados - a coluna esta se expandindo alem do viewport.

## Solucao

Duas mudancas no arquivo `src/pages/Kanban.tsx`:

### 1. Largura FIXA no mobile (linha 284)

Trocar `min-w-[78vw]` por `w-[78vw]` para forcar uma largura exata, nao um minimo:

```
// De:
className="min-w-[78vw] md:min-w-[320px] flex-shrink-0 snap-start"

// Para:
className="w-[78vw] md:w-auto md:min-w-[320px] flex-shrink-0 snap-start"
```

- `w-[78vw]`: largura exata de 78% do viewport no mobile
- `md:w-auto md:min-w-[320px]`: no desktop volta ao comportamento anterior

### 2. Overflow hidden no Card da coluna (linha 288)

Impedir que conteudo interno (nomes longos) expanda o Card alem da largura da coluna:

```
// De:
<Card className="flex flex-col h-[calc(100vh-280px)]">

// Para:
<Card className="flex flex-col h-[calc(100vh-280px)] overflow-hidden">
```

## Por que vai funcionar desta vez

As tentativas anteriores usavam `min-w` (largura minima), que permite o elemento crescer. `w-` (largura exata) + `overflow-hidden` garante que a coluna NUNCA ultrapasse 78vw no mobile, independente do conteudo interno. E uma restricao absoluta, nao uma sugestao.

## Resultado esperado

- Coluna com exatamente 78% da largura da tela (~304px em celular de 390px)
- Margens visiveis de ~43px de cada lado
- Cards estreitos com padding interno de 20px (px-5 ja aplicado)
- Texto longo quebra automaticamente em vez de expandir a coluna
- Visual limpo e profissional no mobile
