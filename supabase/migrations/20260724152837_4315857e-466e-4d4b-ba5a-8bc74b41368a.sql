ALTER TABLE public.leads DISABLE TRIGGER trg_normalize_lead_telefone;
UPDATE public.leads SET telefone = '5511951509764' WHERE id = 'd0e1e6b5-33e3-4b3d-9c35-0deeb321763e';
ALTER TABLE public.leads ENABLE TRIGGER trg_normalize_lead_telefone;