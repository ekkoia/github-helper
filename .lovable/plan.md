## Causa
Na página `/leads`, a coluna "Responsável" e o filtro por responsável usam `usersMap` alimentado por `useUsers` (`select` em `public.profiles`). As policies atuais da tabela `profiles` só permitem SELECT para:
- o próprio usuário (`auth.uid() = user_id`)
- admins (`is_admin(auth.uid())`)

O SDR (Gustavo) não é admin, então o RLS devolve só o próprio perfil dele. Por isso a coluna cai no fallback `"Usuário"` e o dropdown de filtro fica praticamente vazio — não é bug de UI, é falta de permissão de leitura no `profiles`.

## Correção
Adicionar uma policy de SELECT em `public.profiles` liberando leitura para SDR, no mesmo formato da policy de admin — sem tocar em INSERT/UPDATE nem em outras tabelas.

```sql
CREATE POLICY "SDRs can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'sdr'));
```

Isso é suficiente porque:
- `useUsers` só lê `user_id, nome_completo, email, avatar_url` — não expõe dado sensível novo além do que admin já vê.
- SDR já precisa enxergar todos os assessores para atribuir leads, filtrar por responsável e adicionar nota/tag em massa (fluxo que você acabou de pedir).
- Nenhuma mudança de frontend necessária; assim que a policy entra, o `usersMap` passa a resolver `responsavel_id → nome_completo` normalmente.

## Fora de escopo
- Não alterar policies de INSERT/UPDATE/DELETE de `profiles`.
- Não mexer em `useUsers`, `LeadsTable.tsx`, `FiltersSidebar.tsx`, nem em roles/capacidades do SDR.
- Não alterar visibilidade do chat (já foi tratada antes).