-- Habilitar RLS nas tabelas existentes que não tinham
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dados_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_feeagro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para tabelas existentes (acesso apenas para autenticados)
CREATE POLICY "Authenticated users can access chat_messages"
  ON public.chat_messages FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can access chats"
  ON public.chats FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can access dados_cliente"
  ON public.dados_cliente FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can access documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can access leads_feeagro"
  ON public.leads_feeagro FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can access n8n_chat_histories"
  ON public.n8n_chat_histories FOR ALL
  TO authenticated
  USING (true);