

# Atribuicao Automatica de Leads por Faixa de Investimento

## Resumo

Criar um sistema de distribuicao automatica de leads usando round-robin, dividido em **duas filas**:
- **Fila 1**: Leads com investimento ate R$10 mil (valor_produto <= 10000)
- **Fila 2**: Leads com investimento acima de R$10 mil (valor_produto > 10000)

Administradores poderao selecionar quais usuarios participam de cada fila na pagina de Configuracoes.

## Como Vai Funcionar

1. Na pagina de **Configuracoes**, uma nova aba "Distribuicao" permite ao admin arrastar/selecionar usuarios para cada fila
2. Quando um lead novo entra (de qualquer origem), um trigger no banco verifica o valor de investimento e atribui automaticamente ao proximo usuario da fila correspondente
3. O round-robin garante distribuicao igualitaria - cada usuario recebe um lead por vez, em sequencia

## Detalhes Tecnicos

### 1. Novas Tabelas no Banco de Dados

**Tabela `auto_assign_config`** - Define quais usuarios participam de cada fila:

```text
+--------------------+-------------------------------------------+
| Coluna             | Tipo                                      |
+--------------------+-------------------------------------------+
| id                 | uuid (PK)                                 |
| user_id            | uuid (FK -> auth.users)                   |
| faixa              | text ('ate_10k' ou 'acima_10k')           |
| ordem              | integer (posicao no round-robin)          |
| ativo              | boolean (default true)                    |
| created_at         | timestamptz                                |
+--------------------+-------------------------------------------+
```

**Tabela `auto_assign_state`** - Rastreia a posicao atual do round-robin:

```text
+--------------------+-------------------------------------------+
| Coluna             | Tipo                                      |
+--------------------+-------------------------------------------+
| id                 | uuid (PK)                                 |
| faixa              | text (unique, 'ate_10k' ou 'acima_10k')   |
| last_assigned_order| integer (ultima posicao atribuida)        |
| updated_at         | timestamptz                                |
+--------------------+-------------------------------------------+
```

### 2. Funcao de Atribuicao Automatica (Database Trigger)

Uma funcao PL/pgSQL `auto_assign_lead()` que:
- Verifica se o lead nao tem `responsavel_id`
- Determina a faixa com base no `valor_produto` (null ou <= 10000 -> ate_10k, > 10000 -> acima_10k)
- Busca o proximo usuario ativo na fila (round-robin)
- Atribui o `responsavel_id` e atualiza o estado do round-robin
- Funciona como trigger BEFORE INSERT na tabela `leads`

Isso garante que a atribuicao funcione para **todas as origens** (Meta trigger, webhook, criacao manual) sem alterar nenhum codigo existente.

### 3. Interface de Configuracao (Frontend)

Nova aba **"Distribuicao"** na pagina de Configuracoes (visivel apenas para admins), contendo:
- Duas colunas/listas: "Ate R$10 mil" e "Acima de R$10 mil"
- Lista de todos os usuarios com checkbox para adicionar/remover de cada fila
- Possibilidade de reordenar a sequencia do round-robin
- Switch para ativar/desativar a distribuicao automatica

### 4. Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| Nova migracao SQL | Criar tabelas, funcao trigger e politicas RLS |
| `src/components/configuracoes/DistribuicaoSection.tsx` | Nova interface de configuracao de filas |
| `src/pages/Configuracoes.tsx` | Adicionar aba "Distribuicao" |
| `src/hooks/useAutoAssign.ts` | Hook para gerenciar configuracao de distribuicao |
| `src/integrations/supabase/types.ts` | Atualizar tipos gerados |

### 5. Seguranca (RLS)

- Somente admins/globals podem ler e modificar `auto_assign_config` e `auto_assign_state`
- A funcao trigger usa `SECURITY DEFINER` para bypassing RLS ao atribuir leads

