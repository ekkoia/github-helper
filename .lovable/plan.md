
# Centralizar Container do Dashboard

## Problema
A pagina Dashboard nao tem limitacao de largura maxima, fazendo o conteudo ocupar toda a tela. Ja a pagina Leads usa `max-w-[1400px] mx-auto px-4` para centralizar e compactar o conteudo.

## Solucao

Adicionar o mesmo wrapper de centralizacao da pagina Leads no Dashboard.

### Alteracao no src/pages/Dashboard.tsx

**Antes (linhas 63-76):**
```typescript
return (
  <Layout>
    <div className="space-y-8">
      <DashboardHero ... />
      <DashboardCharts leads={leads} />
      <DashboardMetrics leads={leads} />
    </div>
  </Layout>
);
```

**Depois:**
```typescript
return (
  <Layout>
    <div className="w-full max-w-[1400px] mx-auto px-4">
      <div className="space-y-8">
        <DashboardHero ... />
        <DashboardCharts leads={leads} />
        <DashboardMetrics leads={leads} />
      </div>
    </div>
  </Layout>
);
```

### Classes Adicionadas

| Classe | Efeito |
|--------|--------|
| `w-full` | Largura total do container pai |
| `max-w-[1400px]` | Largura maxima de 1400px |
| `mx-auto` | Centraliza horizontalmente |
| `px-4` | Padding horizontal de 16px |

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Dashboard.tsx` | Envolver conteudo com container centralizado |

## Resultado

Os cards e graficos do Dashboard ficarao centralizados e com largura maxima de 1400px, identico ao layout da pagina Leads.
