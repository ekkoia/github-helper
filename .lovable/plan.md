
# Estilizar Scrollbar Horizontal do Kanban

## Problema
A barra de scroll horizontal na parte inferior do Kanban está com cor cinza/branca do sistema, destoando da paleta de cores verde da aplicacao.

## Solucao

Adicionar estilos customizados para a scrollbar no `src/index.css` que combinem com o tema da aplicacao.

### Alteracoes no src/index.css

Adicionar estilos de scrollbar customizada na secao `@layer base`:

```css
/* Scrollbar customizada */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: hsl(var(--muted));
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--primary));
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--accent));
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--primary)) hsl(var(--muted));
}
```

### Cores Aplicadas

| Elemento | Cor Light Mode | Cor Dark Mode |
|----------|---------------|---------------|
| Track (fundo) | Cinza claro (muted) | Verde escuro (muted) |
| Thumb (barra) | Verde escuro (primary) | Verde escuro (primary) |
| Thumb hover | Verde vibrante (accent) | Verde vibrante (accent) |

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/index.css` | Adicionar estilos customizados para scrollbar |

## Resultado Esperado

A scrollbar horizontal do Kanban ficara com:
- Fundo em tom de verde/cinza harmonioso com o tema
- Barra (thumb) em verde escuro (#254239)
- Efeito hover em verde vibrante (#5bcc00)
- Funciona tanto no modo claro quanto escuro
