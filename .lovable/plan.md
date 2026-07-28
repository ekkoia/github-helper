## Objetivo

Adicionar em `/leads` a opção de **Disparo em massa** de templates WhatsApp para leads selecionados, disponível para **admin/global** e **SDR**, aparecendo junto aos botões de ação em massa existentes quando o filtro "Sem interação há" estiver ativo.

## Regras

- Botão só aparece quando:
  - Usuário é admin, global ou SDR (`canAssignLeads`), **e**
  - Filtro `inatividade` está ativo (`!= "all"`), **e**
  - Há leads selecionados.
- Ao clicar, abre um modal com o seletor de template (mesma UX de `/chat`).
- Regra de segurança para **SDR**: o disparo só é permitido se **todos** os leads selecionados estiverem atribuídos a ele (`responsavel_id === user.id`). Se algum não estiver, o modal exibe aviso e bloqueia o envio, listando quantos leads estão fora da regra. Admin/global não têm essa restrição.
- Leads sem `telefone` são ignorados no envio (contabilizados como "pulados").
- Antes de disparar, mostra `AlertDialog` de confirmação com contagem e nome do template (mesma lógica de proteção usada no `/chat`).

## Fluxo do disparo

1. Usuário aplica filtro "Sem interação há X dias"
2. Seleciona leads na tabela
3. Clica em "Disparo em massa" → abre `BulkTemplateDialog`
4. Escolhe template → preview + variáveis (reaproveitar a lógica de preview do `MetaChatInput`)
5. Confirma → para cada lead, chama a edge function `send-whatsapp-message` com `type: "template"` e o telefone do lead
6. Exibe progresso e resumo final (enviados / falhas / pulados)

## Alterações técnicas

- `src/pages/LeadsTable.tsx`
  - Novo estado `isBulkTemplateOpen`
  - Novo botão "Disparo em massa" (ícone `Send`) na barra de ações, condicionado a `canAssignLeads && filters.inatividade !== "all"`
  - Renderiza `<BulkTemplateDialog>` passando os leads selecionados
- `src/components/leads/BulkTemplateDialog.tsx` (novo)
  - Reaproveita `useMetaAccount` + query em `whatsapp_meta_templates` (já usada em `MetaChatInput`)
  - Seletor de template, preview e (quando aplicável) inputs para variáveis
  - Para SDR: valida `responsavel_id === user.id` de cada lead; bloqueia envio caso falhe
  - Loop de envio com `Promise.allSettled` chamando `supabase.functions.invoke("send-whatsapp-message", ...)`
  - Toast de resumo ao final

## Fora de escopo

- Não altera a edge function `send-whatsapp-message` (usa o endpoint atual).
- Não altera a lógica de janela de 24h (template funciona fora dela por design da Meta).
- Não persiste histórico próprio de campanhas — cada envio já grava em `chat_messages` via o fluxo existente.
