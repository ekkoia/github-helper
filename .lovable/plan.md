

# Substituir Logo da Sidebar

## Alterações

### 1. Copiar Nova Logo
Copiar o arquivo enviado para `src/assets/logo-feeagro.png`

### 2. Atualizar AppSidebar.tsx

Alterar o import e uso da logo:

```typescript
// Antes
import logoImaculada from "@/assets/logo-imaculada.png";

// Depois
import logoFeeagro from "@/assets/logo-feeagro.png";
```

```typescript
// Antes
<img 
  src={logoImaculada} 
  alt="Imaculada Agronegócios" 
  className="h-12 w-auto object-contain"
/>

// Depois
<img 
  src={logoFeeagro} 
  alt="Feeagro" 
  className="h-12 w-auto object-contain"
/>
```

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/assets/logo-feeagro.png` | Nova logo (copiada) |
| `src/components/AppSidebar.tsx` | Atualizar import e alt text |

