# Importação em massa de leads via CSV/XLSX

## Objetivo
Permitir que admins importem múltiplos leads de uma só vez, fazendo upload de uma planilha (CSV ou XLSX), com mapeamento de colunas, validação, preview e deduplicação automática antes de gravar no banco.

## Fluxo do usuário

1. Na página **Leads** (tabela), botão novo: **"Importar planilha"** (visível só para admins, ao lado do "Exportar")
2. Modal abre em 4 etapas (wizard):
   - **Etapa 1 — Upload:** arrastar/soltar CSV ou XLSX (até 5 MB / 5.000 linhas). Link para baixar template modelo.
   - **Etapa 2 — Mapeamento:** sistema detecta colunas e sugere mapeamento automático (ex: "Nome" → `nome_completo`). Usuário ajusta se necessário via dropdowns.
   - **Etapa 3 — Preview & Validação:** tabela mostra primeiras 50 linhas com badges de status (✓ válida, ⚠ duplicada, ✗ inválida). Resumo no topo: "X válidas, Y duplicadas (serão mescladas), Z inválidas (serão ignoradas)".
   - **Etapa 4 — Confirmação:** progresso da importação em lotes de 100, com resultado final e link para baixar relatório de erros (CSV).

## Campos suportados (mapeáveis)
Obrigatórios: `nome_completo`, `telefone`, `email`
Opcionais: `perfil`, `intencao`, `tipo_grao`, `volume`, `valor_produto` (aceita faixas como "Até R$10 mil"), `cidade`, `uf`, `etapa_funil`, `origem`, `observacoes`, `nota_assessor`

## Validações
- **Cliente:** schema Zod (mesmas regras do `LeadForm` + `webhook-lead`): email válido, telefone só dígitos, `etapa_funil` deve existir em `funil_etapas`, `valor_produto` parseado via lógica do `parseValorInvestido` do webhook.
- **Deduplicação:** antes de inserir, busca por `email` ou `telefone` normalizado. Se existir, faz **merge** (preenche só campos vazios + adiciona origem ao array `origens` + log em `observacoes`), igual ao `webhook-lead`.
- **Auto-assignment:** o trigger `auto_assign_lead` já cuida da distribuição round-robin automaticamente ao inserir.

## Permissões
Apenas usuários com role `admin` ou `global` veem o botão e podem usar a funcionalidade (via `useUserRole`).

## Arquitetura técnica

### Frontend
- **Lib:** `xlsx` (já instalada — usada em `exportUtils.ts`) para ler XLSX; CSV via parsing manual ou `xlsx` também (suporta CSV).
- **Novo componente:** `src/components/ImportLeadsDialog.tsx` — wizard de 4 etapas usando `Dialog` + estado local.
- **Novo util:** `src/lib/importUtils.ts` — funções: `parseFile(file)`, `autoMapColumns(headers)`, `validateRow(row, mapping, etapas)`, `downloadTemplate()`, `downloadErrorReport(errors)`.
- **Integração:** botão adicionado em `src/pages/LeadsTable.tsx` (próximo aos botões Exportar/Novo Lead), gated por `isAdmin`.

### Backend
- **Nova edge function:** `supabase/functions/import-leads-bulk/index.ts`
  - Recebe array de leads já validados (até 500 por requisição)
  - Para cada lead: aplica mesma lógica de deduplicação do `webhook-lead` (busca por email/telefone, merge ou insert)
  - Retorna por linha: `{ index, status: 'created'|'merged'|'error', lead_id?, error? }`
  - Roda com `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS (admin-gated no front, mas valida JWT do chamador e checa `is_admin` antes de executar)
- **Sem migrations necessárias** — usa tabela `leads` existente e triggers já configurados.

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/ImportLeadsDialog.tsx` | Criar (wizard de upload/mapeamento/preview) |
| `src/lib/importUtils.ts` | Criar (parsing, validação, template) |
| `src/pages/LeadsTable.tsx` | Editar (adicionar botão "Importar planilha" para admins) |
| `supabase/functions/import-leads-bulk/index.ts` | Criar (processamento server-side em lote) |
| `supabase/config.toml` | Editar (registrar função, `verify_jwt = true`) |

## Limites e proteções
- Máx 5.000 linhas por arquivo, 5 MB
- Processamento em lotes de 100 no backend (evita timeout)
- Toast de progresso em tempo real
- Relatório de erros baixável em CSV ao final
