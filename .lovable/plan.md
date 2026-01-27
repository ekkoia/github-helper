
# Plano: Copiar Código Exato do Projeto que Funciona

## Problema

O código atual adiciona validações de autenticação que não existem no projeto original. Essas validações estão retornando 401 e bloqueando a requisição.

## Solução

Substituir o arquivo `supabase/functions/invite-user/index.ts` pelo código EXATO que você me passou do outro projeto.

## Alterações

### Arquivo: `supabase/functions/invite-user/index.ts`

Substituir TODO o conteúdo pelo código do outro projeto (que você colou acima), que:

1. **Não bloqueia** se não houver Authorization header
2. **Não retorna 401** se o token for inválido
3. Apenas **tenta** extrair o usuário para o campo `invited_by`
4. **Continua** o processamento mesmo sem autenticação válida

### Arquivo: `supabase/config.toml`

Manter `verify_jwt = false` para todas as funções (já está assim).

## Por que vai funcionar

O código original não exige autenticação obrigatória na Edge Function. Ele simplesmente tenta identificar quem está convidando, mas o convite é enviado de qualquer forma.

A segurança está na RLS da tabela `pending_invites` e no fato de que apenas usuários logados no frontend conseguem acessar a página de usuários.
