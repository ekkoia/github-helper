

# Sincronizacao do Round-Robin entre CRM e Callix

## Problema

Hoje existem dois sistemas de rodizio independentes:
- O **trigger do CRM** atribui o lead a um usuario (ex: Yasmim)
- O **fluxo externo (n8n/Make)** envia para uma lista do Callix separadamente (ex: Jose)

Como nao se comunicam, o mesmo lead pode ser atribuido a pessoas diferentes em cada sistema.

## Solucao

Tornar o **CRM a unica fonte de verdade** do round-robin. O fluxo externo para de fazer seu proprio rodizio e passa a usar o resultado do CRM para saber para qual lista do Callix enviar.

## Como Vai Funcionar

1. O fluxo externo envia o lead via **webhook-lead** (como ja faz hoje, ou passa a fazer)
2. O trigger do banco faz o round-robin e atribui o `responsavel_id`
3. A resposta do webhook retorna **quem foi atribuido** e os **dados do Callix** (assessores_id e list_id)
4. O fluxo externo usa esses dados para enviar ao Callix correto

```text
Fluxo Externo (n8n)
     |
     | POST /webhook-lead (com valor_produto)
     v
  Edge Function (webhook-lead)
     |
     | INSERT na tabela leads
     v
  Trigger auto_assign_lead()
     |  Round-robin -> define responsavel_id
     v
  Webhook retorna:
     {
       "success": true,
       "data": {
         "id": "...",
         "responsavel_id": "uuid-do-usuario",
         "responsavel_nome": "Yasmim Brito",
         "callix": {
           "assessores_id": "8",
           "list_id": "29",
           "name_assessores": "Yasmin Lima"
         }
       }
     }
     |
     v
  Fluxo externo usa callix.list_id
  para enviar ao Callix correto
```

## Detalhes Tecnicos

### 1. Nova tabela de mapeamento: `user_callix_mapping`

Para vincular cada usuario do CRM ao seu assessor no Callix:

```text
+--------------------+-------------------------------------------+
| Coluna             | Tipo                                      |
+--------------------+-------------------------------------------+
| id                 | uuid (PK)                                 |
| user_id            | uuid (FK -> auth.users, UNIQUE)           |
| callix_assessor_id | text (ID do assessor no Callix)           |
| callix_list_id     | text (ID da lista no Callix)              |
| callix_name        | text (nome no Callix, referencia)         |
| created_at         | timestamptz                                |
+--------------------+-------------------------------------------+
```

Dados iniciais baseados na tabela `campaing_callix` existente (o mapeamento exato sera confirmado por voce):

| Usuario CRM | user_id | callix_assessor_id | callix_list_id |
|-------------|---------|-------------------|----------------|
| Jose Vitor  | a53243c0... | 9 | 30 |
| Yasmim      | 5e1f262c... | 8 | 29 |
| Lucas Lima  | 6da090fd... | 7 | 31 |
| Lucas Silva | 54b47a0a... | 6 | 27 |
| Rodolfo     | fcc0eb8c... | 5 | 28 |
| Ana Carolina| 48be7321... | 4 | 26 |

### 2. Modificacao no webhook-lead

Apos inserir o lead (que ja recebe o `responsavel_id` pelo trigger), o webhook fara uma consulta adicional para buscar:
- Nome do responsavel (tabela `profiles`)
- Dados do Callix (tabela `user_callix_mapping`)

E retornara tudo na resposta para o fluxo externo consumir.

### 3. Interface de gerenciamento (opcional)

Adicionar uma secao na pagina de Configuracoes para que o admin possa gerenciar o mapeamento usuario-Callix, caso os IDs mudem no futuro.

### 4. Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| Nova migracao SQL | Criar tabela `user_callix_mapping` com dados iniciais e RLS |
| `supabase/functions/webhook-lead/index.ts` | Adicionar consulta de responsavel + Callix na resposta |

### 5. O que muda no fluxo externo (n8n/Make)

O fluxo externo precisara de um ajuste simples:
- **Remover** o round-robin proprio
- **Usar** o campo `callix.list_id` da resposta do webhook para saber para qual lista enviar no Callix

### 6. Seguranca

- Tabela `user_callix_mapping`: leitura para autenticados, escrita apenas para admins
- O webhook usa `SERVICE_ROLE_KEY`, entao consegue ler o mapeamento sem restricao de RLS
