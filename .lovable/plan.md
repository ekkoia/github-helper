
# Alinhar Linha do Header da Sidebar com o Header Principal

## Problema Identificado
- Header principal: `h-16` (64px de altura)
- Header da sidebar: `p-6` padding + logo `h-20` = aproximadamente 128px
- Resultado: a linha divisoria da sidebar fica muito abaixo da linha do header principal

## Solucao Proposta

Ajustar o SidebarHeader para ter altura fixa de `h-16` e centralizar a logo verticalmente, usando `max-h` para que a logo se adapte ao espaco disponivel sem alterar suas dimensoes base.

### Alteracao no src/components/AppSidebar.tsx

**Antes (linha 78-84):**
```typescript
<SidebarHeader className="bg-primary p-6 flex items-center justify-center">
  <img 
    src={logoFeeagro} 
    alt="Feeagro" 
    className="h-20 w-auto object-contain"
  />
</SidebarHeader>
```

**Depois:**
```typescript
<SidebarHeader className="bg-primary h-16 flex items-center justify-center border-b border-border">
  <img 
    src={logoFeeagro} 
    alt="Feeagro" 
    className="h-10 w-auto object-contain"
  />
</SidebarHeader>
```

### Detalhes Tecnicos

| Propriedade | Antes | Depois | Motivo |
|-------------|-------|--------|--------|
| Altura header | automatica (~128px) | `h-16` (64px) | Alinhar com header principal |
| Padding | `p-6` (24px) | removido | Altura fixa dispensa padding |
| Logo altura | `h-20` (80px) | `h-10` (40px) | Caber no espaco de 64px com margem |
| Border | nenhum | `border-b border-border` | Linha divisoria visivel |

**Nota:** A logo sera exibida menor (40px ao inves de 80px) para caber no espaco de 64px. Se desejar manter a logo maior, seria necessario aumentar a altura do header principal tambem. Caso prefira essa abordagem, posso ajustar o plano.

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/AppSidebar.tsx` | Ajustar altura do SidebarHeader e tamanho da logo |

## Resultado Esperado

A linha divisoria abaixo da logo da sidebar ficara perfeitamente alinhada com a linha do header principal da pagina, criando uma aparencia mais coesa e profissional.
