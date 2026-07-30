## Objetivo

No `/chat`, no painel lateral direito do lead, adicionar um botão **"Ver detalhes completos"** que abre o mesmo modal de detalhes usado na página `/leads`, sem sair do chat.

## O que será feito

1. **`src/components/chat/LeadInfoPanel.tsx`**
   - Adicionar um botão "Ver detalhes completos" logo abaixo do bloco de avatar/nome (ícone de olho, largura total, estilo secundário do design system).
   - Ao clicar: buscar o registro completo do lead no banco (`select("*").eq("id", lead.id).maybeSingle()`), pois o hook `useLeadByPhone` só carrega um subconjunto de colunas e o modal precisa da linha inteira (observações, campos do formulário, origens, valores etc.).
   - Enquanto carrega, mostrar spinner no botão.
   - Renderizar `<LeadDetailsModal lead={fullLead} isOpen onClose ... />` dentro do painel.

2. **Edição a partir do chat**
   - O modal recebe `onEdit`; será ligado a um `Dialog` com o `LeadForm` (`initialData` = lead completo), igual ao fluxo de `/leads`.
   - Após salvar (`onSuccess`) ou após qualquer atualização no modal (`onLeadUpdated`), chamar `refetch()` do `useLeadByPhone` e recarregar o lead completo, para o painel e o modal ficarem em sincronia.

3. **Mobile**
   - O modal já é responsivo (`Dialog` do shadcn), então funciona no overlay de lead info em telas pequenas sem ajustes extras.

## Detalhes técnicos

- Componentes reutilizados sem alteração: `LeadDetailsModal`, `LeadForm`, `AssignLeadDialog` (já embutido no modal).
- Permissões: o modal já respeita `useUserRole` (atribuição só para admin), e a RLS continua limitando o que o assessor enxerga — nenhuma mudança de política é necessária.
- Nenhuma alteração em hooks de chat, envio de mensagens ou lógica de negócio.

## Validação

- Abrir uma conversa em `/chat`, clicar no botão e conferir que o modal exibe as mesmas informações de `/leads`.
- Editar um campo pelo modal e confirmar que o painel lateral atualiza sem recarregar a página.
