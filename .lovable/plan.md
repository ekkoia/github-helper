## Objetivo

Em `/leads`, dar ao SDR (e manter para admin) três recursos que hoje só existem para admin:

1. Coluna **Responsável** visível na tabela.
2. Filtro **Responsável** na barra lateral de filtros.
3. Ações em massa **Adicionar Nota** e **Adicionar Tag** ao lado dos botões existentes (Mover, Atribuir, Disparo em massa, Excluir) quando há leads selecionados.

## Escopo e visibilidade

- Coluna e filtro Responsável: liberar para `isAdmin || isSDR`. Usuário comum continua sem ver (ele só tem os próprios leads).
- Ações em massa Nota/Tag: liberar para `isAdmin || isSDR`. O SDR só consegue disparar em leads que ele já enxerga (RLS garante isso; sem mudanças no banco).
- Nenhum comportamento existente é alterado para admin/user comum.

## Mudanças por arquivo

### `src/pages/LeadsTable.tsx`
- Trocar `{isAdmin && <TableHead>Responsável</TableHead>}` e o `<TableCell>` correspondente por `{(isAdmin || isSDR) && ...}`. Ajustar o `colSpan` do estado vazio.
- Expor `isSDR` do `useUserRole()` (já existe no hook).
- Adicionar dois botões novos dentro da barra de ações em massa (bloco atual das linhas ~810-897), visíveis quando `canAssignLeads` (admin+SDR) e `selectedLeadIds.size > 0`:
  - **Adicionar Nota**: abre um `Dialog` com `<Textarea>` + opção "Substituir nota existente" (padrão: anexar com quebra de linha ao `nota_assessor` atual). Confirma → `update` em batch nos IDs selecionados.
  - **Adicionar Tag**: abre um `Popover`/`Dialog` listando tags do catálogo (`useLeadTagsCatalog`) com checkboxes; ao confirmar, insere linhas em `lead_tag_assignments` para cada combinação `(lead_id, tag_id)` selecionada, ignorando duplicatas (`onConflict: 'lead_id,tag_id', ignoreDuplicates: true`).
- Após sucesso: toast, `refetch` dos leads e limpar seleção.

### `src/components/FiltersSidebar.tsx`
- Trocar a condição `{isAdmin && ...}` do bloco de filtro Responsável por `{(isAdmin || isSDR) && ...}` e expor `isSDR` do hook.

### Novos componentes (pequenos, focados)
- `src/components/leads/BulkAddNoteDialog.tsx` — dialog controlado com props `open`, `onOpenChange`, `leadIds`, `onDone`.
- `src/components/leads/BulkAddTagDialog.tsx` — idem, usando `useLeadTagsCatalog`.

Ambos usam o `supabase` client já importado; sem edge functions novas.

## Detalhes técnicos

- **Nota em massa**: `leads.nota_assessor` é `text` único por lead. Modo padrão = anexar (`nota atual + "\n" + nova`), com opção de sobrescrever. Para anexar precisamos ler as notas atuais dos IDs selecionados (`select id, nota_assessor`) e fazer `upsert`/`update` por lead — feito em `Promise.all` com chunks de 50.
- **Tag em massa**: montar array `[{ lead_id, tag_id, atribuido_por: user.id }]` e um único `insert` com `{ onConflict: 'lead_id,tag_id', ignoreDuplicates: true }`.
- Sem migração: RLS de `leads` e `lead_tag_assignments` já cobre SDR (política atual permite gerenciar leads visíveis).
- Sem mudanças em `/chat`, hooks de conversas, webhooks ou outras páginas.

## Fora do escopo

- Não altero regras de atribuição, deduplicação, disparo em massa existente, RLS ou permissões de outros papéis.
- Não mexo em usuário comum: ele continua sem coluna/filtro Responsável.
