
# Corrigir Cores das Colunas do Kanban em Produção

## Problema Identificado

O Tailwind CSS usa um compilador JIT (Just-In-Time) que escaneia o código fonte em tempo de build para gerar apenas as classes CSS necessárias. Quando construímos classes dinamicamente como `bg-[#6366f1]`, o compilador não consegue detectá-las porque elas são criadas em tempo de execução.

**Por que funciona no Lovable mas não em produção?**
- No Lovable (desenvolvimento), o hot-reload pode processar classes de forma diferente
- Em produção, o CSS é pré-compilado e classes dinâmicas não são incluídas

## Solução

Usar **inline styles** em vez de classes Tailwind dinâmicas para aplicar as cores HEX do banco de dados.

## Alterações Necessárias

### 1. Modificar `src/hooks/useFunilEtapas.ts`

Retornar o valor HEX bruto em vez de tentar convertê-lo para classe Tailwind:

```typescript
// Mapa de cores: nome da etapa -> cor (hex ou classe)
const coresMap: Record<string, string> = {};
query.data?.forEach((etapa) => {
  // Retorna a cor HEX diretamente para uso com inline style
  coresMap[etapa.nome] = etapa.cor || "#6b7280"; // gray-500 como fallback
});
```

### 2. Modificar `src/pages/Kanban.tsx`

Usar inline style no CardHeader em vez de classe CSS:

**Antes:**
```typescript
<CardHeader 
  className={`${corClasse} text-white rounded-t-xl`}
```

**Depois:**
```typescript
<CardHeader 
  className="text-white rounded-t-xl"
  style={{ backgroundColor: coresMap[etapa] || "#6b7280" }}
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useFunilEtapas.ts` | Retornar cores HEX brutas |
| `src/pages/Kanban.tsx` | Usar inline style para backgroundColor |

## Resultado Esperado

As cores das colunas do Kanban funcionarão corretamente tanto no ambiente de desenvolvimento (Lovable) quanto em produção, pois inline styles não dependem do compilador Tailwind.

## Nota Técnica

Esta é uma limitação conhecida do Tailwind - classes CSS não podem ser construídas dinamicamente. A documentação oficial recomenda usar inline styles ou safelist quando cores dinâmicas são necessárias.
