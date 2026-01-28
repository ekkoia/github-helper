
# Alterar Label "Produtor" para "Investidor" no Kanban

## Problema
Nos cards do Kanban, ao lado do icone de perfil (User), está aparecendo "Produtor" (vindo do campo `lead.perfil`). O usuario deseja que apareca "Investidor" no lugar.

## Solucao

Alterar a linha 301 do arquivo `src/pages/Kanban.tsx`:

**Antes:**
```typescript
<div className="flex items-center gap-2">
  <User className="h-3.5 w-3.5" aria-hidden="true" />
  <span>{lead.perfil}</span>
</div>
```

**Depois:**
```typescript
<div className="flex items-center gap-2">
  <User className="h-3.5 w-3.5" aria-hidden="true" />
  <span>Investidor</span>
</div>
```

## Arquivo a Modificar

| Arquivo | Linha | Alteracao |
|---------|-------|-----------|
| `src/pages/Kanban.tsx` | 301 | Substituir `{lead.perfil}` por `Investidor` |

## Resultado
Todos os cards no Kanban exibirao "Investidor" ao lado do icone de usuario, independente do valor armazenado no banco de dados.
