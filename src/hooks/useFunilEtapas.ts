import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunilEtapa {
  id: string;
  nome: string;
  cor: string | null;
  ordem: number;
  ativo: boolean | null;
}

// Cores padrão caso não tenha cor definida no banco
const CORES_PADRAO: Record<string, string> = {
  "Novo Lead": "bg-blue-500",
  "Em atendimento IA": "bg-purple-500",
  "Atendimento Humano": "bg-indigo-500",
  "Reunião Agendada": "bg-amber-500",
  "Proposta Enviada": "bg-orange-500",
  "Ganho": "bg-green-500",
  "Perdido": "bg-red-500",
  "Sem interesse": "bg-gray-500",
  "Ghost": "bg-slate-500",
  "Nutrir": "bg-teal-500",
  "Parceiro": "bg-cyan-500",
};

async function fetchFunilEtapas(): Promise<FunilEtapa[]> {
  const { data, error } = await supabase
    .from("funil_etapas")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao buscar etapas do funil:", error);
    throw error;
  }

  return data || [];
}

export function useFunilEtapas() {
  const query = useQuery({
    queryKey: ["funil-etapas"],
    queryFn: fetchFunilEtapas,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos (anteriormente cacheTime)
  });

  // Lista apenas os nomes das etapas
  const etapasNomes = query.data?.map((etapa) => etapa.nome) || [];

  // Mapa de cores: nome da etapa -> classe de cor
  const coresMap: Record<string, string> = {};
  query.data?.forEach((etapa) => {
    // Prioriza a cor do banco, senão usa a cor padrão
    if (etapa.cor) {
      // Se a cor do banco for um hex ou classe válida
      coresMap[etapa.nome] = etapa.cor.startsWith("#") 
        ? `bg-[${etapa.cor}]` 
        : etapa.cor;
    } else {
      coresMap[etapa.nome] = CORES_PADRAO[etapa.nome] || "bg-gray-500";
    }
  });

  return {
    etapas: query.data || [],
    etapasNomes,
    coresMap,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
