# Disparo em massa para qualquer seleção de leads

## Situação atual

Na página /leads, o botão **Disparo em massa** só aparece quando o filtro "Sem interação há" está ativo (`filters.inatividade !== "all"`). Por isso, ao selecionar leads importados (ou qualquer outra seleção sem esse filtro), o botão não aparece — mesmo com 20 leads selecionados, como no print.

## O que muda

- O botão **Disparo em massa** passa a aparecer sempre que houver leads selecionados, independentemente de filtro (importados, por origem, por tag, por etapa, busca, etc.).
- Nenhum filtro novo precisa ser criado.
- As regras de envio continuam exatamente as mesmas do disparo atual:
  - só leads com telefone válido entram no envio;
  - para SDR (não admin), somente leads atribuídos a ele são elegíveis; se houver leads de outros assessores na seleção, o aviso vermelho continua bloqueando o envio;
  - o modal segue exigindo um template aprovado e mostra a contagem de elegíveis antes de confirmar.
- Quem vê o botão continua sendo admin/global/SDR (mesma permissão dos outros botões em massa).

## Detalhe técnico

`src/pages/LeadsTable.tsx`: na barra de ações em massa, trocar a condição `canAssignLeads && filters.inatividade && filters.inatividade !== "all"` por apenas `canAssignLeads`. Sem mudanças em `BulkTemplateDialog.tsx`, banco ou edge functions.
