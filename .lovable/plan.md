

# Configuração dos Secrets para Edge Functions

## Objetivo
Adicionar os secrets necessários para o funcionamento das Edge Functions de convite de usuários.

## Secrets a Configurar

| Secret | Valor |
|--------|-------|
| `SITE_URL` | `https://id-preview--4857f2d3-9941-4691-862c-d1c44dc8fe55.lovable.app` |
| `RESEND_API_KEY` | `re_R2UkPR78_9kKsRV9Z9ycNBGzoS1E8jXSc` |

## Ações

1. **Adicionar SITE_URL** - Usado para gerar links corretos nos emails de convite
2. **Adicionar RESEND_API_KEY** - Usado para autenticar com a API do Resend e enviar emails
3. **Verificar deploy das Edge Functions** - Garantir que as funções estão deployadas e funcionando

## Resultado Esperado

Após a configuração:
- A função `invite-user` poderá gerar links de convite corretos
- A função `send-invite-email` poderá enviar emails via Resend
- O fluxo completo de convite de usuários estará operacional

## Próximos Passos Após Configuração

1. Testar o fluxo de autenticação (criar conta)
2. Promover seu usuário para admin global
3. Testar o convite de novos usuários

