
## Problema
No `/chat`, o painel lateral do lead (nome, tag, etapa, faixa, atribuído) demora a aparecer porque `useLeadByPhone` baixa **todos os leads** paginando de 1000 em 1000 e faz o match do telefone no navegador. Com o volume atual (vários milhares), o carregamento inicial fica em loading por segundos.

## Correção
Buscar o lead diretamente no banco usando a chave normalizada `telefone_key` (já indexável e usada em outros pontos), retornando 1 linha em vez de milhares.

### Mudança única
`src/hooks/useLeadByPhone.ts`:
- Remover `fetchLeadsForPanel` (loop de páginas).
- Em `fetchLead`, normalizar o telefone com `normalizePhoneForMatch` e consultar:
  ```
  supabase.from("leads")
    .select("id,nome_completo,telefone,email,etapa_funil,responsavel_id,nota_assessor,origem,data_criacao,faixa_investimento,investimento_real")
    .eq("telefone_key", <chave>)
    .maybeSingle()
  ```
- Para não-admin, adicionar `.eq("responsavel_id", user.id)` (RLS já filtra, mas mantém consistência).
- Se `maybeSingle` não retornar, fazer fallback `ilike` no `telefone` com o sufixo (só como segurança para leads antigos sem `telefone_key`).

## Fora de escopo
- Não mexer em `useConversations`, `useChatMessages`, filtros, tags nem RLS.
- Nenhuma alteração de schema.
