-- Adicionar coluna origem na tabela leads
ALTER TABLE leads
ADD COLUMN origem text;

COMMENT ON COLUMN leads.origem IS 'Origem/fonte do lead (Instagram, Meta, etc)';