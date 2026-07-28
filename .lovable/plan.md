## Objetivo

Dos ~110 contatos "não encontrados" da lista anterior, importar apenas os que possuem telefone, marcá-los com a nova tag **Kyc-Pend** e colocá-los na nova etapa **Onboarding**, distribuindo entre os assessores ativos via rodízio automático (round-robin por faixa).

## Passos

### 1. Migração (schema + seed de configuração)
- Criar etapa no funil:
  - `INSERT INTO funil_etapas (nome, cor, ordem, ativo) VALUES ('Onboarding', '#06b6d4', 18, true)` — cor ciano, ainda não usada em nenhuma etapa.
- Criar tag:
  - `INSERT INTO lead_tags (nome, cor, emoji, categoria, ordem, ativo) VALUES ('Kyc-Pend', '#f59e0b', '📋', 'Onboarding', 100, true)`.

### 2. Preparação da lista (build mode)
- Reprocessar a lista original de 124 contatos.
- Manter só os que aparecem como **não encontrados** e possuem telefone preenchido (aplica `normalize_telefone_br`).
- Reverificar contra `leads.telefone_key` para descartar quaisquer que já foram criados após a última checagem.

### 3. Inserção dos leads
Para cada contato restante, usar `supabase--insert` com um `INSERT ... SELECT` que:
- Preenche `nome_completo`, `email` (lowercased), `telefone` (via `normalize_telefone_br`).
- Define `etapa_funil = 'Onboarding'`, `origem = 'importados'`, `origens = '["importados"]'::jsonb`.
- Define `responsavel_id` chamando o rodízio: reutilizamos a lógica existente `get_proximo_assessor` / `auto_assign_lead` (o trigger `auto_assign_lead` já roda em BEFORE INSERT e atribui pela faixa `sem_valor` quando `valor_produto` é nulo — isso cobre o round-robin sem precisar de código novo).
- O trigger `trg_dedupe_lead_by_phone` continua ativo como salvaguarda contra duplicatas por telefone.

### 4. Associar a tag Kyc-Pend
Após o insert, executar um `INSERT INTO lead_tag_assignments (lead_id, tag_id) SELECT id, '<tag_id>' FROM leads WHERE origem = 'importados' AND data_criacao >= '<timestamp do import>'`.

### 5. Verificação final
- Contar quantos leads foram criados, quantos foram deduplicados (merged) e a distribuição por responsável.
- Retornar um resumo com totais + amostra de 5 leads criados.

## Detalhes técnicos

- Todos os inserts respeitam RLS (executados via ferramenta `supabase--insert` como service role).
- A etapa "Onboarding" fica com `ordem=18` no final da lista. Se preferir outra posição, ajuste antes de aprovar.
- Cor da etapa: `#06b6d4` (ciano). Nenhuma etapa atual usa essa cor.
- Cor da tag: `#f59e0b` (âmbar) para destacar pendência de KYC. Ajustável.
- Telefones inválidos (fixos, muito curtos) serão descartados antes do insert e listados no resumo.
- Não haverá disparo de mensagem automática — apenas cadastro + atribuição + tag.

## Riscos / o que não muda

- Não altero `auto_assign_config` nem o estado do rodízio manualmente; a distribuição segue exatamente a ordem atual do round-robin.
- Não mexo em nenhum outro trigger, função ou tela.
- Se algum contato "não encontrado" já tiver sido criado nesse meio-tempo, o trigger de dedupe evita duplicata.
