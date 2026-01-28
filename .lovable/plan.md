

# Aumentar Tamanho da Logo na Sidebar

## Problema
A logo atual está com `h-12` (48px de altura), ficando pequena no header da sidebar.

## Solução

Alterar a classe de altura da logo no `src/components/AppSidebar.tsx`:

**Antes:**
```typescript
<img 
  src={logoFeeagro} 
  alt="Feeagro" 
  className="h-12 w-auto object-contain"
/>
```

**Depois:**
```typescript
<img 
  src={logoFeeagro} 
  alt="Feeagro" 
  className="h-20 w-auto object-contain"
/>
```

Também aumentar o padding do header para dar mais espaço:

**Antes:**
```typescript
<SidebarHeader className="bg-primary p-5 flex items-center justify-center">
```

**Depois:**
```typescript
<SidebarHeader className="bg-primary p-6 flex items-center justify-center">
```

## Comparativo de Tamanhos

| Classe | Altura |
|--------|--------|
| h-12 (atual) | 48px |
| h-16 | 64px |
| h-20 (proposto) | 80px |

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/AppSidebar.tsx` | Aumentar `h-12` para `h-20` e `p-5` para `p-6` |

