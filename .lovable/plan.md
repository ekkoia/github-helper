# Corrigir distribuição automática de leads

## Diagnóstico

A distribuição **não está funcionando** com a configuração nova. A UI de "Distribuição" (`DistribuicaoSection` → `useRodizio`) salva a fila em `rodizio_config` / `rodizio_state` (rodízio único, sequencial, sem faixas de valor). Porém o trigger no banco `auto_assign_lead` **ainda lê da tabela antiga** `auto_assign_config`, que hoje tem **0 registros** — ou seja, todo lead novo cai no ramo "sem config" e sai do trigger sem responsável.

Estado atual:
- `rodizio_config`: 2 assessores ativos (Juliana ordem=1, Pedro Teste ordem=2)
- `auto_assign_config`: **vazia** ← o trigger consulta essa
- Leads dos últimos 7 dias: **0 atribuídos** (todos WhatsApp não qualificados, que por regra o trigger ignora — isso está correto)
- Nenhum lead de `meta_form`/`webhook` recente para comprovar, mas se entrasse agora ficaria sem responsável.

Também impactado: a edge function `next-assessor` continua lendo `auto_assign_config` + parâmetro `faixa`, o que não bate mais com o rodízio simples.

## O que será feito

### 1. Reescrever `public.auto_assign_lead()` (migração)
- Remover a lógica de faixas por `valor_produto`.
- Ler de `rodizio_config` (apenas `ativo = true`, ordenado por `ordem`).
- Usar `rodizio_state` (linha única `id=1`) com `contador` + `ultimo_user_id` para avançar sequencialmente, com wrap-around no fim da lista.
- Manter: skip se `responsavel_id` já vier preenchido; skip se etapa = `Lead WhatsApp (não qualificado)`; reaproveitar responsável de lead duplicado (mesmo email/telefone).

### 2. Atualizar `supabase/functions/next-assessor/index.ts`
- Remover exigência do parâmetro `faixa`.
- Ler próximo assessor de `rodizio_config` + `rodizio_state` com a mesma lógica do trigger (sem gravar o avanço — só retorna quem seria o próximo, mantendo o comportamento atual do endpoint de "preview").
- Continuar retornando o mapping do Callix.

### 3. Não mexer
- UI de Distribuição, `useRodizio`, tabelas `rodizio_config`/`rodizio_state` (já estão corretas).
- Regra de WhatsApp não qualificado.
- Nada de faixas de valor (o rodízio novo é único).

## Detalhes técnicos

Trecho central da nova `auto_assign_lead` (pseudo):

```text
lock rodizio_state row (id=1) FOR UPDATE
lista := SELECT user_id, ordem FROM rodizio_config WHERE ativo ORDER BY ordem
if lista vazia -> return NEW
idx := posição de ultimo_user_id em lista; próximo := lista[(idx+1) % len]
NEW.responsavel_id := próximo.user_id
UPDATE rodizio_state SET ultimo_user_id = próximo.user_id, contador = contador+1
```

Nenhuma alteração em dados existentes; leads antigos permanecem como estão.
