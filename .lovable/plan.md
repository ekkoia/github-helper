
# Automação de Leads FDS (final de semana)

## Objetivo
Todo lead criado no sábado ou domingo cai automaticamente na etapa **"Leads FDS"**. Na segunda-feira às 8h (horário de Brasília), uma automação varre essa etapa e envia o template Meta `arv_retivacao_leads_fds` para todos os leads que ainda não foram atendidos (nem por mudança de etapa, nem por mensagem outbound do assessor/admin).

## 1. Etapa no funil
- Criar a etapa **"Leads FDS"** em `funil_etapas` (ativa, ordem no início do funil, cor destacada — ex: laranja).

## 2. Classificação automática ao criar o lead
- Ajustar o fluxo de criação para que, se `data_criacao` cair em sábado ou domingo (timezone `America/Sao_Paulo`), `etapa_funil` seja definida como `"Leads FDS"` em vez de `"Lead novo!"`.
- Implementação: novo trigger `BEFORE INSERT` em `leads` (`trg_set_leads_fds`) que, quando `etapa_funil` está vazia ou igual ao default `"Lead novo!"`, checa o dia da semana e reescreve para `"Leads FDS"`. Assim vale para todos os canais (Meta form, webhook-lead, criação manual, chat).

## 3. Critério de "atendido"
Um lead FDS **não** recebe o template se qualquer uma das condições for verdadeira até o momento do disparo:
- `etapa_funil` já não é mais `"Leads FDS"` (foi movido); **ou**
- Existe pelo menos uma mensagem outbound no `chat_messages` para o telefone do lead após `data_criacao` (assessor ou admin já mandou algo, manual ou via template).

Para evitar reenvio caso a automação rode mais de uma vez, adicionar coluna `template_fds_enviado_em timestamptz` em `leads`. Se preenchida, o lead é ignorado.

## 4. Edge function `weekend-leads-followup`
Nova função que:
1. Busca todos os leads onde `etapa_funil = 'Leads FDS'` e `template_fds_enviado_em IS NULL`.
2. Para cada um, verifica se existe mensagem outbound no `chat_messages` posterior à `data_criacao` — se existir, pula (e marca `template_fds_enviado_em = now()` para não reavaliar).
3. Busca a conta Meta compartilhada em `whatsapp_meta_accounts` (mesma lógica de `useMetaAccount`).
4. Envia o template `arv_retivacao_leads_fds` via Graph API (`/{phone_number_id}/messages`), usando o `telefone` já normalizado (E.164 sem `+`).
5. Em caso de sucesso: grava `template_fds_enviado_em = now()`, registra em `chat_messages` (outbound, `message_type = 'template'`) para manter histórico, cria `notifications` para o `responsavel_id` e admins, e opcionalmente cria um `agenda_events` de follow-up.
6. Em caso de erro do Meta (template não aprovado, número inválido, fora de janela etc.), loga em `user_activities` ou em log próprio e segue para o próximo.

## 5. Agendamento (segunda 8h BRT)
- Habilitar `pg_cron` + `pg_net` (se ainda não).
- Criar job via `supabase--insert` (não migration, pois contém URL e anon key específicos do projeto):
  - Nome: `weekend-leads-followup-monday-8am`
  - Cron: `0 11 * * 1` (11h UTC = 8h BRT, segunda-feira)
  - Ação: `net.http_post` para `https://omilhfohvstqsonhyuxp.supabase.co/functions/v1/weekend-leads-followup` com header `apikey`.

## 6. UI (mínimo)
- A nova etapa aparece automaticamente no Kanban e nos filtros (já é dinâmico via `useFunilEtapas`).
- Nenhuma tela nova precisa ser criada. Configuração do nome do template fica fixa no código (`arv_retivacao_leads_fds`) — se quiser tornar configurável depois, é fácil promover para uma tabela de settings.

## Detalhes técnicos

### Migração SQL
```sql
-- Coluna de controle
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS template_fds_enviado_em timestamptz;

-- Nova etapa
INSERT INTO public.funil_etapas (nome, cor, ordem, ativo)
VALUES ('Leads FDS', '#f97316', 1, true)
ON CONFLICT DO NOTHING;

-- Trigger: se lead entra no sábado/domingo, vai para 'Leads FDS'
CREATE OR REPLACE FUNCTION public.set_leads_fds()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  dow int;
BEGIN
  IF NEW.etapa_funil IS NULL OR NEW.etapa_funil = 'Lead novo!' THEN
    dow := EXTRACT(DOW FROM (COALESCE(NEW.data_criacao, now())
              AT TIME ZONE 'America/Sao_Paulo'));
    IF dow IN (0, 6) THEN            -- 0=domingo, 6=sábado
      NEW.etapa_funil := 'Leads FDS';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_leads_fds
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_leads_fds();
```

### Edge function (esqueleto)
`supabase/functions/weekend-leads-followup/index.ts` — service role, sem verify_jwt (chamado pelo cron), CORS opcional. Loop pelos leads, chama `graph.facebook.com/{api_version}/{phone_number_id}/messages` com `type: "template"` e o nome `arv_retivacao_leads_fds`.

### Cron
Executado via `supabase--insert` após deploy da função (não vai numa migration).

## Fora do escopo
- Criar/aprovar o template `arv_retivacao_leads_fds` na Meta (precisa já estar aprovado antes de ativar).
- Alterar rodízio ou regras de atribuição — segue igual.
- Configurar variáveis do template no painel — se o template tiver variáveis dinâmicas, me avise depois quais campos preencher (ex: `{{1}}` = nome do lead).
