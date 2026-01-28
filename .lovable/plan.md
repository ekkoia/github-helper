
# Corrigir Badge do Ticket Medio - Usar Cor com Contraste no Dark Mode

## Problema Real

A cor `status-ganho` e definida como `hsl(156 26% 17%)` que e o mesmo verde escuro do fundo dos cards no dark mode. Aumentar a opacidade nao resolve porque:

- Badge: verde escuro com qualquer opacidade
- Fundo card dark: verde escuro
- Resultado: zero contraste, badge invisivel

## Solucao

Usar a cor `secondary` (verde vibrante #5bcc00) no dark mode para o badge, que oferece excelente contraste contra o fundo escuro enquanto mantem a semantica de "verde = dinheiro".

## Alteracao no src/components/DashboardMetrics.tsx

**Linha 82 - Alterar:**
```typescript
// Antes
bgColor: "bg-status-ganho/20 dark:bg-status-ganho/30"

// Depois - usar verde vibrante no dark mode
bgColor: "bg-status-ganho/20 dark:bg-secondary/20"
```

**Linha 81 - Alterar tambem a cor do icone:**
```typescript
// Antes
color: "text-status-ganho"

// Depois - icone visivel no dark mode
color: "text-status-ganho dark:text-secondary"
```

## Cores

| Modo | Badge | Icone |
|------|-------|-------|
| Light | Verde escuro 20% | Verde escuro |
| Dark | Verde vibrante 20% | Verde vibrante |

## Arquivo a Modificar

| Arquivo | Linhas | Alteracao |
|---------|--------|-----------|
| `src/components/DashboardMetrics.tsx` | 81-82 | Usar secondary no dark mode |

## Resultado

O badge e icone do card "Ticket Medio" terao contraste adequado no dark mode usando o verde vibrante (#5bcc00) que se destaca contra o fundo escuro.
