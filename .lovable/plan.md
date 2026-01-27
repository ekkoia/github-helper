
# Plano: Dinamizar as Etapas do Funil

## Resumo do Problema
As etapas do funil estão funcionando corretamente no banco de dados (as alterações foram salvas), mas o sistema não reflete essas mudanças porque o código usa listas fixas (hardcoded) em vez de carregar as etapas dinamicamente do banco.

## Solução
Criar um sistema centralizado que carregue as etapas do banco de dados e as disponibilize para todos os componentes que precisam delas.

---

## Etapas da Implementação

### 1. Criar Hook Centralizado para Etapas do Funil
**Arquivo:** `src/hooks/useFunilEtapas.ts`

Criar um hook React Query que:
- Busca as etapas ativas da tabela `funil_etapas`
- Ordena por campo `ordem`
- Gera automaticamente o mapeamento de cores
- Disponibiliza cache para evitar múltiplas requisições

### 2. Atualizar o Schema de Validação
**Arquivo:** `src/lib/validations.ts`

- Remover a validação estrita de enum para `etapa_funil`
- Usar `z.string()` com validação customizada ou aceitar qualquer string (a validação será feita no Select)

### 3. Atualizar LeadForm
**Arquivo:** `src/components/LeadForm.tsx`

- Remover constante `ETAPAS_FUNIL` hardcoded
- Importar e usar o hook `useFunilEtapas`
- Renderizar etapas dinamicamente no Select

### 4. Atualizar FiltersSidebar
**Arquivo:** `src/components/FiltersSidebar.tsx`

- Remover constante `ETAPAS_FUNIL` hardcoded
- Receber as etapas como prop ou usar o hook
- Renderizar filtros dinamicamente

### 5. Atualizar Kanban
**Arquivo:** `src/pages/Kanban.tsx`

- Remover constantes `ETAPAS_FUNIL` e `ETAPAS_CORES` hardcoded
- Usar o hook `useFunilEtapas`
- Gerar colunas dinamicamente baseado nas etapas ativas

### 6. Atualizar LeadsTable
**Arquivo:** `src/pages/LeadsTable.tsx`

- Remover objeto `ETAPAS_CORES` hardcoded
- Usar cores dinâmicas do hook ou prop

### 7. Atualizar Edge Function webhook-lead
**Arquivo:** `supabase/functions/webhook-lead/index.ts`

- Consultar etapas válidas do banco antes de validar
- Ou remover validação estrita (aceitar qualquer etapa)

---

## Detalhes Técnicos

### Estrutura do Hook
```text
useFunilEtapas() retorna:
├── etapas: Array<{id, nome, cor, ordem}>
├── etapasNomes: string[]
├── coresMap: Record<string, string>
├── isLoading: boolean
└── refetch: function
```

### Benefícios
- Alterações no painel de configurações refletem imediatamente em todo o sistema
- Cores personalizadas do banco são usadas em todos os componentes
- Código mais limpo e manutenível
- Elimina duplicação de dados

### Arquivos a Modificar
1. `src/hooks/useFunilEtapas.ts` (criar)
2. `src/lib/validations.ts` (modificar)
3. `src/components/LeadForm.tsx` (modificar)
4. `src/components/FiltersSidebar.tsx` (modificar)
5. `src/pages/Kanban.tsx` (modificar)
6. `src/pages/LeadsTable.tsx` (modificar)
7. `supabase/functions/webhook-lead/index.ts` (modificar)
