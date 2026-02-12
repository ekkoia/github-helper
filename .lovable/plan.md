
# Perfil responsivo no mobile

## Problemas identificados

Na screenshot, o header do perfil (avatar + nome + email + botao Editar) fica apertado no mobile porque usa `flex` horizontal com o botao "Editar" ao lado. O avatar grande (80px), o nome, o email e o botao competem pelo espaco, fazendo o conteudo ser cortado.

## Solucao

### Arquivo: `src/pages/Perfil.tsx`

**1. Header do perfil empilhado no mobile (linhas 207-248)**

Mudar o layout do header para empilhar verticalmente no mobile:
- Avatar + nome/email ficam em coluna no mobile, lado a lado no desktop
- Botao "Editar" fica abaixo no mobile, ao lado no desktop
- Avatar menor no mobile (h-16 w-16 vs h-20 w-20)
- Nome com texto menor no mobile (text-xl vs text-2xl)

```tsx
// Header container: empilhar no mobile
<div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
  <div className="flex items-center gap-3 md:gap-4">
    <Avatar className="h-16 w-16 md:h-20 md:w-20">
      ...
    </Avatar>
    <div className="min-w-0">
      <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">
        ...
      </h2>
      <p className="text-muted-foreground text-sm md:text-base truncate">{user?.email}</p>
      ...
    </div>
  </div>
  {/* Botao Editar - largura total no mobile */}
  <Button variant="outline" className="gap-2 w-full md:w-auto">...</Button>
</div>
```

**2. Grid de informacoes pessoais (linha ~261)**

O grid `grid-cols-1 md:grid-cols-2` ja e responsivo, nao precisa de mudanca.

**3. Email longo com truncate**

Adicionar `truncate` e `min-w-0` nos textos longos (nome e email) para evitar overflow no mobile.

## Resultado esperado

- No mobile: avatar e nome empilham melhor, botao Editar aparece por completo, textos longos sao truncados
- No desktop: layout atual mantido sem alteracoes visuais
