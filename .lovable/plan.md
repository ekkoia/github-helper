

# Pagina de Usuarios responsiva no mobile

## Problemas identificados (pela screenshot)

1. **CardHeader**: O titulo "Usuarios Cadastrados" e o botao "+ Adicionar Usuario" estao lado a lado (`flex-row`), causando sobreposicao no mobile
2. **Card de cada usuario**: O layout horizontal (`flex items-center justify-between`) coloca nome/badges e os controles (Select + botoes) na mesma linha, ficando apertado e desalinhado
3. **Select de role**: O `w-[140px]` ocupa espaco demais ao lado dos botoes no mobile
4. **Nomes longos**: Nomes como "Ana Clara Silva Inacio" quebram o layout porque nao ha truncamento

## Solucao

### Arquivo: `src/pages/Usuarios.tsx`

**1. CardHeader empilhado no mobile (linha 269)**

Mudar de `flex-row` para empilhar no mobile:

```tsx
// De:
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">

// Para:
<CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4">
```

**2. Card de cada usuario empilhado no mobile (linhas 299-366)**

Mudar o container de cada usuario para empilhar verticalmente no mobile:

```tsx
// De:
<div className="flex items-center justify-between p-4 border rounded-lg ...">

// Para:
<div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg gap-3 ...">
```

**3. Controles (Select + botoes) em linha separada no mobile (linha 322)**

Os controles ficam abaixo do nome/email no mobile, alinhados a esquerda:

```tsx
// De:
<div className="flex items-center gap-2">

// Para:
<div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
```

**4. Select de role responsivo (linha 329)**

Reduzir largura no mobile:

```tsx
// De:
<SelectTrigger className="w-[140px] h-9">

// Para:
<SelectTrigger className="w-[120px] md:w-[140px] h-9">
```

**5. Truncamento de nomes longos (linha 305)**

Adicionar `truncate` e `max-w` ao nome para evitar quebra:

```tsx
<span className="font-medium text-foreground truncate max-w-[200px]">
```

**6. Texto do titulo da pagina responsivo (linha 263)**

```tsx
<h1 className="text-2xl md:text-3xl font-bold text-foreground">
```

## Resultado esperado

- No mobile: header empilhado, cada card de usuario com nome/badges em cima e controles embaixo, tudo visivel sem cortes
- No desktop: layout atual mantido sem alteracoes visuais
