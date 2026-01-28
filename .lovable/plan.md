
# Substituir Logo da Pagina de Autenticacao

## Objetivo

Trocar a logo atual (Imaculada) pela logo Feeagro enviada, com container circular mantendo o fundo na cor primaria atual (verde escuro).

## Alteracoes Necessarias

### 1. Salvar a nova imagem no projeto

Arquivo: `src/assets/logo-feeagro-auth.png`

### 2. Modificar `src/pages/Auth.tsx`

**Alterar o import (linha 10):**
```typescript
// Antes
import logoImaculada from "@/assets/logo-imaculada.png";

// Depois
import logoFeeagro from "@/assets/logo-feeagro-auth.png";
```

**Alterar o elemento da logo (linhas 99-107):**

```typescript
// Antes - Container horizontal
<div className="flex justify-center mb-6">
  <div className="bg-primary rounded-full p-6 shadow-elevation-2">
    <img 
      src={logoImaculada} 
      alt="Imaculada Agronegócios" 
      className="h-16 w-auto object-contain"
    />
  </div>
</div>

// Depois - Circulo proporcional com fundo verde primario
<div className="flex justify-center mb-6">
  <div className="w-28 h-28 bg-primary rounded-full shadow-elevation-2 flex items-center justify-center p-4">
    <img 
      src={logoFeeagro} 
      alt="Feeagro" 
      className="w-full h-full object-contain"
    />
  </div>
</div>
```

### Detalhes das Classes CSS

| Classe | Efeito |
|--------|--------|
| `w-28 h-28` | Largura e altura fixas de 112px (circulo perfeito) |
| `bg-primary` | Fundo verde escuro (#254239) - cor atual |
| `rounded-full` | Borda completamente arredondada |
| `flex items-center justify-center` | Centraliza a imagem dentro do circulo |
| `p-4` | Padding interno para a logo nao encostar nas bordas |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/assets/logo-feeagro-auth.png` | Nova imagem (copiar do upload) |
| `src/pages/Auth.tsx` | Trocar import e ajustar elemento da logo |

## Resultado Visual

Container circular de 112px com fundo verde escuro (cor primaria atual), contendo a logo Feeagro centralizada.
