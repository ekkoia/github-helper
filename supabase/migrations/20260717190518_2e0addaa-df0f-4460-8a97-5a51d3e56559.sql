
CREATE OR REPLACE FUNCTION public.phone_key(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text;
BEGIN
  IF _phone IS NULL OR _phone = '' THEN RETURN NULL; END IF;
  d := regexp_replace(_phone, '[^0-9]', '', 'g');
  IF length(d) IN (12,13) AND left(d,2) = '55' THEN
    d := substr(d, 3);
  END IF;
  IF length(d) = 11 AND substr(d,3,1) = '9' THEN
    d := substr(d,1,2) || substr(d,4);
  END IF;
  IF length(d) < 8 THEN RETURN NULL; END IF;
  RETURN right(d, 10);
END;
$$;

DO $$
DECLARE
  grp record;
  keeper_id uuid;
  dup record;
  merged_obs text;
  merged_origens jsonb;
  merged_nome text;
  merged_email text;
BEGIN
  FOR grp IN
    SELECT public.phone_key(telefone) AS k
    FROM leads
    WHERE telefone IS NOT NULL AND telefone <> ''
    GROUP BY public.phone_key(telefone)
    HAVING public.phone_key(telefone) IS NOT NULL AND COUNT(*) > 1
  LOOP
    SELECT id INTO keeper_id
    FROM leads
    WHERE public.phone_key(telefone) = grp.k
    ORDER BY data_criacao ASC
    LIMIT 1;

    FOR dup IN
      SELECT l.* FROM leads l
      WHERE public.phone_key(l.telefone) = grp.k
        AND l.id <> keeper_id
      ORDER BY l.data_criacao ASC
    LOOP
      -- Compute merged values from keeper + dup
      SELECT
        CASE
          WHEN k.nome_completo IS NULL OR trim(k.nome_completo) = '' OR k.nome_completo = 'Sem nome'
          THEN COALESCE(NULLIF(trim(dup.nome_completo),''), k.nome_completo)
          ELSE k.nome_completo END,
        COALESCE(k.email, dup.email),
        COALESCE(k.observacoes, '') || E'\n[Merge dedupe ' || now()::text || '] ' ||
          COALESCE(dup.observacoes, '(sem obs)') || ' | origem: ' || COALESCE(dup.origem,'-') ||
          ' | etapa: ' || COALESCE(dup.etapa_funil,'-'),
        CASE
          WHEN dup.origens IS NULL OR dup.origens = '[]'::jsonb THEN k.origens
          ELSE (SELECT COALESCE(jsonb_agg(DISTINCT v), '[]'::jsonb)
                FROM jsonb_array_elements(COALESCE(k.origens,'[]'::jsonb) || dup.origens) v)
        END
      INTO merged_nome, merged_email, merged_obs, merged_origens
      FROM leads k WHERE k.id = keeper_id;

      -- Delete dup FIRST to free unique constraints (email)
      DELETE FROM leads WHERE id = dup.id;

      -- Then update keeper
      UPDATE leads SET
        nome_completo = merged_nome,
        email = merged_email,
        valor_produto = COALESCE(valor_produto, dup.valor_produto),
        perfil = COALESCE(perfil, dup.perfil),
        intencao = COALESCE(intencao, dup.intencao),
        tipo_grao = COALESCE(tipo_grao, dup.tipo_grao),
        volume = COALESCE(volume, dup.volume),
        cidade = COALESCE(cidade, dup.cidade),
        uf = COALESCE(uf, dup.uf),
        meta_lead_id = COALESCE(meta_lead_id, dup.meta_lead_id),
        created_time_brasil = COALESCE(created_time_brasil, dup.created_time_brasil),
        observacoes = merged_obs,
        origens = merged_origens,
        data_atualizacao = now()
      WHERE id = keeper_id;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS telefone_key text
  GENERATED ALWAYS AS (public.phone_key(telefone)) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS leads_telefone_key_unique
  ON public.leads (telefone_key)
  WHERE telefone_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.dedupe_lead_by_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  existing_id uuid;
BEGIN
  v_key := public.phone_key(NEW.telefone);
  IF v_key IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO existing_id
  FROM leads
  WHERE telefone_key = v_key
  ORDER BY data_criacao ASC
  LIMIT 1;

  IF existing_id IS NULL THEN RETURN NEW; END IF;

  UPDATE leads SET
    nome_completo = CASE
      WHEN nome_completo IS NULL OR trim(nome_completo) = '' OR nome_completo = 'Sem nome'
      THEN COALESCE(NULLIF(trim(NEW.nome_completo),''), nome_completo)
      ELSE nome_completo END,
    email = COALESCE(email, NEW.email),
    valor_produto = COALESCE(valor_produto, NEW.valor_produto),
    perfil = COALESCE(perfil, NEW.perfil),
    intencao = COALESCE(intencao, NEW.intencao),
    tipo_grao = COALESCE(tipo_grao, NEW.tipo_grao),
    volume = COALESCE(volume, NEW.volume),
    cidade = COALESCE(cidade, NEW.cidade),
    uf = COALESCE(uf, NEW.uf),
    meta_lead_id = COALESCE(meta_lead_id, NEW.meta_lead_id),
    created_time_brasil = COALESCE(created_time_brasil, NEW.created_time_brasil),
    observacoes = COALESCE(observacoes,'') || E'\n[Auto-merge por telefone ' || now()::text || '] ' ||
                  COALESCE(NEW.observacoes,'(sem obs)') || ' | origem: ' || COALESCE(NEW.origem,'-'),
    origens = CASE
      WHEN NEW.origem IS NULL OR NEW.origem = '' THEN origens
      WHEN origens IS NULL OR origens = '[]'::jsonb THEN jsonb_build_array(NEW.origem)
      WHEN NOT (origens @> to_jsonb(NEW.origem)) THEN origens || to_jsonb(NEW.origem)
      ELSE origens
    END,
    data_atualizacao = now()
  WHERE id = existing_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_dedupe_lead_by_phone ON public.leads;
CREATE TRIGGER trg_dedupe_lead_by_phone
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.dedupe_lead_by_phone();
