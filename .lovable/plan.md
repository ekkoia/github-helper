

# Adicionar logging de auditoria na Distribuicao

## Problema

Nao ha registro de quem ativou, pausou, adicionou ou removeu usuarios da fila de auto-assign. Quando a Ana foi pausada, nao foi possivel identificar quem fez isso nem quando.

## Solucao

Integrar o hook `useActivityLog` nas acoes do `DistribuicaoSection`, registrando cada operacao com metadados relevantes (usuario afetado, faixa, acao).

## Arquivos a modificar

### 1. `src/components/configuracoes/DistribuicaoSection.tsx`

- Importar `useActivityLog`
- Criar wrapper functions para `addUser`, `removeUser`, `toggleUser` e `reorderUsers` que chamam `logActivity` apos o sucesso da operacao
- Usar o `usersMap` para incluir o nome do usuario afetado nos logs

Acoes a registrar:
- **Adicionar usuario**: `config_updated` com descricao "Adicionou [nome] na fila [faixa]"
- **Remover usuario**: `config_updated` com descricao "Removeu [nome] da fila [faixa]"
- **Ativar/Pausar**: `config_updated` com descricao "Ativou/Pausou [nome] na fila [faixa]"
- **Reordenar**: `config_updated` com descricao "Reordenou fila [faixa]"

Metadata incluira: `{ action: 'add'|'remove'|'toggle'|'reorder', target_user_id, faixa }`

### 2. `src/hooks/useActivityLog.ts`

- Adicionar `'auto_assign_updated'` como novo `ActivityType` (opcional, pode usar `config_updated` existente)

## Detalhes tecnicos

Os wrappers serao criados no `DistribuicaoSection` para manter o hook `useAutoAssign` desacoplado do logging. Exemplo:

```text
const handleAdd = async (userId, faixa) => {
  const ok = await addUser(userId, faixa);
  if (ok) {
    const userName = usersMap[userId]?.nome_completo || usersMap[userId]?.email;
    logActivity('config_updated', `Adicionou ${userName} na fila ${faixa}`, {
      action: 'add', target_user_id: userId, faixa
    });
  }
  return ok;
};
```

O mesmo padrao se aplica a `handleRemove`, `handleToggle` e `handleReorder`.

