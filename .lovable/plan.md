## Diagnóstico

Investiguei `MetaChatInput.tsx`, as políticas RLS e os dados reais no Supabase. Encontrei duas causas raiz distintas.

### 1. Templates não aparecem para os usuários
- A tabela `whatsapp_meta_templates` **não tem nenhum GRANT** para o role `authenticated` (consulta em `information_schema.role_table_grants` retorna vazio). Sem GRANT, o PostgREST bloqueia a leitura mesmo com RLS permissiva.
- Além disso, a policy `user_own_templates` exige que a conta Meta pertença ao próprio usuário (`whatsapp_meta_accounts.user_id = auth.uid()`). Só existe **uma** conta Meta compartilhada, pertencente ao usuário `601cda2a-…` (Arvora Whatsapp Comercial). Qualquer outro usuário (admin ou comum) que não seja o dono cai fora dessa policy — só admin/global veem via `admin_all_templates`; assessores comuns ficam sem nenhum template.

### 2. Janela de 24h aponta como aberta mas envio não libera
- Em `MetaChatInput.tsx` (linhas 120-128), a consulta que decide `isWithin24h` filtra `.eq("meta_account_id", metaAccount.id)` nas mensagens inbound.
- Nas 10 últimas mensagens inbound reais (`whatsapp_instance_name='meta_official'`), **todas têm `meta_account_id = NULL`** — o webhook que grava os inbounds não carimba a conta. Resultado: o filtro sempre retorna zero linhas, `isWithin24h` fica `false`, e a UI trava em "Fora da janela de 24h — apenas templates aprovados", mesmo quando o lead acabou de responder. Combinado com o bug 1, o assessor não consegue enviar nem texto livre nem template.

## Correções propostas

### A) Templates — migration
- `GRANT SELECT ON public.whatsapp_meta_templates TO authenticated;`
- `GRANT ALL ON public.whatsapp_meta_templates TO service_role;`
- Substituir a policy `user_own_templates` (só o dono da conta) por uma policy que permita a qualquer usuário autenticado ler templates `status = 'approved'` da conta Meta compartilhada — espelhando o padrão já usado em `whatsapp_meta_accounts` (`any_authenticated_user_can_view_meta_account`). INSERT/UPDATE/DELETE continuam restritos a admin/global.

### B) Janela de 24h — código
- Em `src/components/chat/MetaChatInput.tsx`, remover o filtro `.eq("meta_account_id", metaAccount.id)` da query que busca a última mensagem inbound. Manter os filtros por `whatsapp_instance_name = 'meta_official'`, `message_direction = 'inbound'` e o `like` no telefone. Assim a janela passa a considerar corretamente qualquer inbound recente daquele contato pelo número comercial.
- Atualizar o comentário no bloco para refletir que o webhook não carimba `meta_account_id` nos inbounds.

## Fora de escopo
- Não vou alterar o webhook de inbound para começar a gravar `meta_account_id` (mudança de backend maior, sem impacto para a correção do front).
- Nenhuma outra alteração em UI/estilos.
