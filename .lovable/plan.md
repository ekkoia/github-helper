
# Abas de Configuracoes responsivas no mobile

## Problema

A `TabsList` com 4 abas ("Preferencias", "Funil", "Campos Customizados", "Distribuicao") nao cabe na tela mobile. O texto "Campos Customizados" e longo e as abas ficam cortadas.

## Solucao

Duas mudancas no arquivo `src/pages/Configuracoes.tsx`:

### 1. TabsList com scroll horizontal e largura total

Adicionar `w-full` na TabsList e envolver em um container com `overflow-x-auto` para permitir scroll horizontal quando as abas nao cabem:

```
<div className="max-w-3xl mx-auto overflow-x-auto">
  <TabsList className="w-full md:w-auto">
```

### 2. Esconder icones no mobile para economizar espaco

Adicionar `hidden md:inline` nos icones das abas para que no mobile so apareca o texto, liberando espaco:

```
<Settings className="h-4 w-4 hidden md:inline" />
```

### 3. Texto mais curto no mobile para "Campos Customizados"

Usar texto abreviado no mobile:

```
<TabsTrigger value="campos" className="gap-2">
  <Plus className="h-4 w-4 hidden md:inline" />
  <span className="md:hidden">Campos</span>
  <span className="hidden md:inline">Campos Customizados</span>
</TabsTrigger>
```

## Resultado esperado

- No mobile: abas com texto compacto, sem icones, cabem na tela sem cortar
- No desktop: visual atual mantido com icones e texto completo
