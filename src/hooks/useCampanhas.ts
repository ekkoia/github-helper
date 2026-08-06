import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Campanha {
  id: string;
  nome: string;
  template_name: string | null;
  template_language: string;
  criado_por: string;
  status: string;
  total_publico: number;
  total_enviado: number;
  total_falha: number;
  total_bloqueado: number;
  created_at: string;
}

export interface CampanhaDestinatario {
  id: string;
  campanha_id: string;
  lead_id: string | null;
  nome: string | null;
  telefone: string | null;
  responsavel_id: string | null;
  status: string;
  meta_message_id: string | null;
  erro: string | null;
  created_at: string;
}

export const useCampanhas = () => {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampanhas = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("campanhas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Erro ao buscar campanhas:", error);
    setCampanhas((data as Campanha[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampanhas();
  }, [fetchCampanhas]);

  return { campanhas, loading, refetch: fetchCampanhas };
};

export const fetchDestinatarios = async (
  campanhaId: string,
): Promise<CampanhaDestinatario[]> => {
  const { data, error } = await (supabase as any)
    .from("campanha_destinatarios")
    .select("*")
    .eq("campanha_id", campanhaId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Erro ao buscar destinatários:", error);
    return [];
  }
  return (data as CampanhaDestinatario[]) || [];
};
