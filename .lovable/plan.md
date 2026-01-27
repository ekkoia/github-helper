
# Configuração dos Secrets e Sistema de Autenticação

## Situação Atual
- O build está funcionando (erro do `tem_royalties` foi corrigido)
- As Edge Functions estão prontas: `invite-user`, `send-invite-email`
- Falta adicionar os secrets: `SITE_URL` e `RESEND_API_KEY`
- Você está na página `/auth` pronta para criar sua conta

---

## Etapa 1: Adicionar Secrets

Vou adicionar os seguintes secrets ao Supabase:

| Secret | Valor | Uso |
|--------|-------|-----|
| `SITE_URL` | `https://id-preview--4857f2d3-9941-4691-862c-d1c44dc8fe55.lovable.app` | Gerar links de convite corretos |
| `RESEND_API_KEY` | `re_R2UkPR78_9kKsRV9Z9ycNBGzoS1E8jXSc` | Enviar emails via Resend |

---

## Etapa 2: Deploy das Edge Functions

Fazer deploy das funções:
- `invite-user` - Cria convites e gera links
- `send-invite-email` - Envia emails customizados

---

## Etapa 3: Criar Sua Conta

Na página `/auth`:
1. Preencha seu email e senha
2. Clique em "Criar conta"
3. Confirme o email (se necessário)

---

## Etapa 4: Promover para Admin Global

Após criar a conta, executar SQL para promover seu usuário:

```text
INSERT INTO user_roles (user_id, role)
SELECT id, 'global'
FROM auth.users
WHERE email = 'seu-email@exemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## Etapa 5: Testar Sistema de Convites

1. Acessar área de Usuários no CRM
2. Convidar um novo usuário
3. Verificar se email é enviado corretamente

---

## O Que Farei Automaticamente

1. Adicionar secret `SITE_URL`
2. Adicionar secret `RESEND_API_KEY`
3. Fazer deploy das Edge Functions
4. Testar se as funções estão respondendo

## O Que Você Precisará Fazer

1. Criar sua conta na página `/auth`
2. Me informar seu email para eu executar o SQL de promoção a admin
