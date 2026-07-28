## Objetivo
Criar um papel **SDR** que permite atribuição em massa de leads (e uso do filtro de inatividade) sem dar poderes completos de admin. Aplicar ao Gustavo agora, mas deixar escalável para outros SDRs futuros.

## Escopo confirmado
- SDR **pode**: atribuir em massa para qualquer assessor, usar o filtro "Sem interação há X dias".
- SDR **não pode**: excluir em massa, ver todos os leads de outros (mantém RLS atual de usuário comum vendo apenas os próprios).
- Observação: como o SDR só vê os leads dele, a atribuição em massa vale para reatribuir leads que estão com ele para outro assessor. Se depois quiser que o SDR veja todos os leads, é uma expansão separada.

## Mudanças no banco
1. Adicionar valor `sdr` ao enum `app_role`.
2. Atualizar a função `has_role` continua funcionando automaticamente (já é genérica).
3. Ajustar `useUserRole.ts` order — hoje faz `order('role', ascending)` e pega 1 papel. Vou trocar por: buscar todos os papéis do usuário e escolher o de maior privilégio (`global > admin > sdr > user`), para o caso do Gustavo ter dois papéis futuramente.
4. Inserir o papel `sdr` para o `user_id` do Gustavo (via insert tool após a migração ser aprovada).

## Mudanças no frontend
Arquivo central: novo hook/derivação em `useUserRole.ts`:
- Expor `isSDR` e um capability derivada `canAssignLeads = isAdmin || isSDR`.
- Expor `canUseInactivityFilter = isAdmin || isSDR`.
- `isAdmin` continua significando admin/global (não muda). Isso preserva todo o resto do sistema (colunas, exclusão em massa, filtros exclusivos etc.).

Ajustes pontuais em `src/pages/LeadsTable.tsx`:
- Botão/menu de "Atribuir Responsável" em massa: trocar guard de `isAdmin` para `canAssignLeads`.
- Ação de bulk assign (chamada de update em `responsavel_id`): mesmo guard.
- Filtro de inatividade (barra lateral + coluna "Última interação"): trocar guard de `isAdmin` para `canUseInactivityFilter`.
- **Não mexer** nos guards de: exclusão em massa, coluna "Responsável", contagem "no total", filtro por responsável, "unassigned" etc. — continuam só admin.

Ajustes em `src/components/leads/FiltersSidebar.tsx`:
- Filtro "Sem interação há" passa a receber `canUseInactivityFilter` (via prop já existente ou nova) em vez de `isAdmin`.

## Detalhes técnicos
- Migração 1 (schema): `ALTER TYPE public.app_role ADD VALUE 'sdr';`
- Migração 2 (dados, via insert tool depois): `INSERT INTO public.user_roles (user_id, role) VALUES ('<user_id_do_gustavo>', 'sdr');` — vou pedir/confirmar o user_id antes de rodar.
- RLS existentes que usam `has_role(auth.uid(), 'admin')` continuam negando ao SDR, o que é intencional. O bulk assign do SDR funciona porque a policy de UPDATE em `leads` permite ao responsável atual atualizar seus próprios leads (é o caso do Gustavo hoje).
- `useUserRole.ts`: substituir `.limit(1).maybeSingle()` por `.select('role')` sem limit e reduzir para o papel de maior privilégio.

## Verificação
1. Logar como Gustavo: botão "Atribuir Responsável" em massa aparece; filtro "Sem interação há" aparece; botão de excluir em massa **não** aparece; coluna "Responsável" **não** aparece.
2. Logar como usuário comum: nada muda.
3. Logar como admin: nada muda.
4. Gustavo consegue reatribuir seus próprios leads para outro assessor via seleção em massa.