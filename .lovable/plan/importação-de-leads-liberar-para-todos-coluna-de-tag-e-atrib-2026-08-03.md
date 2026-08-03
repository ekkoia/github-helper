# Importação de leads: liberar para todos, coluna de tag e atribuição automática

## O que muda

1. **Botão "Importar" visível para todos os usuários** na página /leads (hoje só aparece para admin/global).
2. **Coluna "Tags" na planilha** (template e importação): o usuário pode informar uma ou mais tags separadas por vírgula ou ponto e vírgula (ex: `Kyc-Pend, VIP`).
   - Tags existentes são reconhecidas pelo nome (ignorando maiúsculas/acentos) e aplicadas ao lead.
   - Tag informada que ainda não existe é criada automaticamente (cor padrão) e aplicada.
3. **Atribuição automática ao importador**: todo lead novo criado pela importação fica com o usuário que fez a importação como responsável, sem entrar no rodízio.
   - Leads que já existem no CRM (mesclados por telefone/e-mail) mantêm o responsável atual — apenas recebem as tags e as informações complementares.

## Detalhes técnicos

- `src/pages/LeadsTable.tsx`: remover a condição `isAdmin` que envolve o botão de importar.
- `src/lib/importUtils.ts`:
  - adicionar `{ key: "tags", label: "Tags" }` em `TARGET_FIELDS`, ao tipo `TargetField` e em `HEADER_ALIASES` (`tags`, `tag`, `etiquetas`, `marcadores`).
  - `validateRow`: manter o valor de tags como string bruta (split feito no backend).
  - `downloadTemplate`: incluir a coluna Tags com exemplo `Kyc-Pend` e uma instrução sobre separar por vírgula.
- `supabase/functions/import-leads-bulk/index.ts`:
  - remover o bloqueio 403 "admin only" — passa a exigir apenas usuário autenticado válido.
  - no insert de lead novo, definir `responsavel_id = userData.user.id` (isso desativa o `auto_assign_lead`, que só age quando `responsavel_id` é nulo).
  - após criar/mesclar, resolver as tags: buscar em `lead_tags` por nome normalizado; criar as ausentes (via service role, `ativo = true`); inserir em `lead_tag_assignments` com `atribuido_por = userData.user.id`, ignorando duplicatas.
  - retornar contagem de tags aplicadas no summary (opcional, para a mensagem final).
- `src/components/ImportLeadsDialog.tsx`: nenhuma mudança estrutural além do campo extra já suportado pelo mapeamento genérico; a etapa de pré-visualização passa a exibir a coluna Tags quando mapeada.

## Observações

- Não é necessária migração de banco: a criação de tags e as atribuições são feitas pela edge function com privilégio de serviço.
- Como usuários comuns só veem leads atribuídos a eles, os leads importados aparecerão imediatamente na lista de quem importou.
