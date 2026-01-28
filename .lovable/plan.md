
# Corrigir Badge do Ticket Medio no Dark Mode

## Problema

O card "Ticket Medio" usa a cor `status-ganho` (verde escuro #254239) para o badge do icone. A classe `bg-status-ganho/10` aplica apenas 10% de opacidade, que no dark mode praticamente desaparece porque:

- Cor do badge: verde escuro com 10% opacidade
- Fundo do card no dark mode: verde escuro (#254239 com variacao)
- Resultado: contraste zero, badge invisivel

## Solucao

Aumentar a opacidade do badge especificamente no dark mode usando classes condicionais do Tailwind, ou usar uma opacidade maior que funcione em ambos os modos.

## Alteracao no src/components/DashboardMetrics.tsx

**Linha 82 - Alterar:**
```typescript
// Antes
bgColor: "bg-status-ganho/10"

// Depois - opacidade maior para garantir visibilidade
bgColor: "bg-status-ganho/20 dark:bg-status-ganho/30"
```

Isso aplica:
- Light mode: 20% opacidade (mais visivel que os 10% atuais)
- Dark mode: 30% opacidade (destaque adequado no fundo escuro)

## Arquivo a Modificar

| Arquivo | Linha | Alteracao |
|---------|-------|-----------|
| `src/components/DashboardMetrics.tsx` | 82 | Aumentar opacidade do badge com variante dark |

## Resultado

O badge do icone DollarSign no card "Ticket Medio" tera contraste adequado tanto no light quanto no dark mode.
