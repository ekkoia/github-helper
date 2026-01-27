import { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

export const exportToCSV = (leads: Lead[], filename: string = "leads.csv") => {
  if (leads.length === 0) {
    return;
  }

  // Define headers
  const headers = [
    "Protocolo",
    "Nome Completo",
    "Telefone",
    "Email",
    "Perfil",
    "Etapa do Funil",
    "Tipo de Grão",
    "Intenção",
    "Volume",
    "Valor do Produto",
    "Cidade",
    "UF",
    "Localização Embarque",
    "Distância (km)",
    "Estrada de Terra (km)",
    "Armazenamento",
    "Qualidade",
    "Tem Royalties",
    "Percentual Royalties",
    "Sentido",
    "Observações",
    "Data de Criação",
  ];

  // Map leads to CSV rows
  const rows = leads.map((lead) => [
    lead.protocolo_atendimento || "",
    lead.nome_completo || "",
    lead.telefone || "",
    lead.email || "",
    lead.perfil || "",
    lead.etapa_funil || "",
    lead.tipo_grao || "",
    lead.intencao || "",
    lead.volume || "",
    lead.valor_produto?.toString() || "",
    lead.cidade || "",
    lead.uf || "",
    lead.localizacao_embarque || "",
    lead.distancia_km?.toString() || "",
    lead.estrada_terra_km?.toString() || "",
    lead.armazenamento || "",
    lead.qualidade || "",
    lead.tem_royalties || "",
    lead.percentual_royalties?.toString() || "",
    lead.sentido || "",
    lead.observacoes || "",
    new Date(lead.data_criacao).toLocaleString("pt-BR"),
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Create and download file
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
