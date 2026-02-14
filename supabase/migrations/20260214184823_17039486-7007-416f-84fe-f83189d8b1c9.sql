-- Leads que vieram do meta_form mas tambem interagiram via WhatsApp
UPDATE leads
SET origens = '["meta_form", "whatsapp"]'::jsonb
WHERE origem = 'meta_form'
  AND observacoes LIKE '%INFORMAÇÕES COMPLEMENTARES%'
  AND NOT (origens @> '"whatsapp"'::jsonb);

-- Leads que vieram do whatsapp mas tambem preencheram formulario Meta
UPDATE leads
SET origens = '["whatsapp", "meta_form"]'::jsonb
WHERE origem = 'whatsapp'
  AND observacoes LIKE '%Formulário%'
  AND NOT (origens @> '"meta_form"'::jsonb);