
# Plano de Configuração Completa do CRM Imaculada

## Visao Geral

O projeto é um CRM completo para gestão de leads agrícolas, com funcionalidades de:
- Gestão de leads (tabela e kanban)
- Sistema de usuários com roles (user, admin, global)
- Dashboard com métricas
- Log de atividades
- Preferências de usuário
- Convite de novos usuários via email

O código frontend está completo, mas o banco de dados Supabase conectado não possui as tabelas necessárias. Precisamos criar toda a estrutura do banco de dados.

---

## Etapa 1: Criar Estrutura do Banco de Dados

### 1.1 Criar Enum para Roles
```sql
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'global');
```

### 1.2 Criar Tabela `profiles`
Armazena informações adicionais dos usuários:
- user_id (referência ao auth.users)
- nome_completo
- email
- telefone
- created_at, updated_at

### 1.3 Criar Tabela `user_roles`
Seguindo as melhores práticas de segurança (roles separados do profile):
- id
- user_id (referência ao auth.users)
- role (app_role enum)

### 1.4 Criar Tabela `leads`
Tabela principal de leads com todos os campos:
- id
- nome_completo, telefone, email
- perfil (Produtor, Corretor, Armazém)
- etapa_funil
- protocolo_atendimento
- intencao, tipo_grao, volume, valor_produto
- cidade, uf, localizacao_embarque
- distancia_km, sentido, estrada_terra_km
- armazenamento, qualidade
- tem_royalties, percentual_royalties
- observacoes
- data_criacao, data_atualizacao

### 1.5 Criar Tabela `user_activities`
Log de atividades do sistema:
- id
- user_id
- activity_type
- description
- metadata (JSONB)
- created_at

### 1.6 Criar Tabela `user_preferences`
Preferências de usuário:
- id
- user_id
- theme, default_view, density
- email_notifications, app_notifications
- digest_frequency, inactive_lead_alerts
- created_at, updated_at

### 1.7 Criar Tabela `pending_invites`
Convites pendentes de usuários:
- id
- email
- nome_completo
- telefone
- role
- invited_by
- created_at

### 1.8 Criar Tabela `funil_etapas`
Etapas configuráveis do funil:
- id
- nome
- cor
- ordem
- ativo
- created_at

### 1.9 Criar Tabela `lead_custom_fields`
Campos customizados para leads:
- id
- nome
- label
- tipo
- obrigatorio
- opcoes (JSONB)
- ordem
- ativo
- created_at

---

## Etapa 2: Configurar Row Level Security (RLS)

### 2.1 Criar função auxiliar `has_role`
Função SECURITY DEFINER para verificar roles sem recursão:
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 2.2 Políticas de RLS para cada tabela
- **profiles**: Usuários podem ver/editar próprio perfil; admins podem ver todos
- **user_roles**: Apenas admins podem gerenciar; usuários podem ver próprio role
- **leads**: Todos usuários autenticados podem CRUD
- **user_activities**: Admins podem ver todas; usuários podem criar próprias
- **user_preferences**: Usuários gerenciam próprias preferências
- **pending_invites**: Apenas admins podem gerenciar
- **funil_etapas**: Admins podem gerenciar; todos podem ler
- **lead_custom_fields**: Admins podem gerenciar; todos podem ler

---

## Etapa 3: Criar Triggers e Functions

### 3.1 Trigger para criar profile automaticamente
Quando um usuário é criado no auth.users, criar automaticamente um registro em profiles.

### 3.2 Trigger para criar role padrão
Atribuir role 'user' automaticamente a novos usuários.

### 3.3 Trigger para atualizar updated_at
Atualizar automaticamente data_atualizacao em leads e updated_at em profiles.

---

## Etapa 4: Inserir Dados Iniciais

### 4.1 Etapas padrão do funil
Inserir as 11 etapas padrão:
1. Novo Lead
2. Em atendimento IA
3. Atendimento Humano
4. Reunião Agendada
5. Proposta Enviada
6. Ganho
7. Perdido
8. Sem interesse
9. Ghost
10. Nutrir
11. Parceiro

---

## Etapa 5: Configurar Edge Functions

### 5.1 Adicionar secrets necessários
- `SITE_URL`: URL do site (https://id-preview--4857f2d3-9941-4691-862c-d1c44dc8fe55.lovable.app ou domínio customizado)
- `RESEND_API_KEY`: Para envio de emails de convite (se usar Resend)

### 5.2 Verificar deploy das edge functions
Garantir que todas as edge functions estão deployadas:
- invite-user
- send-invite-email
- delete-user
- delete-user-by-email
- webhook-lead

---

## Etapa 6: Atualizar Types do Supabase

Após criar as tabelas, o arquivo `src/integrations/supabase/types.ts` será automaticamente atualizado para incluir os tipos corretos das novas tabelas.

---

## Etapa 7: Criar Primeiro Usuário Admin

Para começar a usar o sistema:
1. Criar conta via página de login
2. Manualmente promover para 'global' admin via SQL ou dashboard Supabase

---

## Resumo Técnico

| Recurso | Ação |
|---------|------|
| 9 tabelas novas | Criar via migration |
| 1 enum (app_role) | Criar via migration |
| 15+ políticas RLS | Criar via migration |
| 3 triggers | Criar via migration |
| 2+ functions | Criar via migration |
| 11 etapas funil | Seed data via migration |
| 2 secrets | Configurar manualmente |
| 5 edge functions | Verificar deploy |

---

## Dependências e Ordem de Execução

```text
1. Criar enum app_role
      |
2. Criar tabelas (profiles primeiro, pois outras dependem)
      |
3. Habilitar RLS em todas as tabelas
      |
4. Criar função has_role (SECURITY DEFINER)
      |
5. Criar políticas RLS
      |
6. Criar triggers (new_user_profile, new_user_role, updated_at)
      |
7. Inserir dados iniciais (funil_etapas)
      |
8. Configurar secrets das edge functions
      |
9. Testar autenticação e fluxos principais
```

---

## Próximos Passos Após Aprovação

1. Executarei a migration SQL completa
2. Configurarei os secrets necessários
3. Verificarei o deploy das edge functions
4. Testarei o fluxo de autenticação
5. Orientarei sobre a criação do primeiro admin
