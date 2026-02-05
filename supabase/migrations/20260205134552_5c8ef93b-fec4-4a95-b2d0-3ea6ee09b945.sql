-- Preencher created_time_brasil para leads WhatsApp existentes
-- Converte data_criacao (UTC) para horário Brasil
UPDATE leads
SET created_time_brasil = data_criacao AT TIME ZONE 'America/Sao_Paulo'
WHERE origem = 'whatsapp'
  AND created_time_brasil IS NULL;