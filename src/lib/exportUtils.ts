import { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

interface UserProfile {
  user_id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
}

export const exportToCSV = (
  leads: Lead[],
  usersMap: Record<string, UserProfile>,
  filename: string = "leads.csv"
) => {
  if (leads.length === 0) {
    return;
  }

  const headers = [
    "Nome Completo",
    "Telefone",
    "Email",
    "Qtd Cotas",
    "Valor Investido",
    "Investimento Real",
    "Etapa do Funil",
    "Origem",
    "Responsável",
    "Nota do Assessor",
    "Observações",
    "Data de Criação",
  ];

  const getOrigemLabel = (origem: string | null): string => {
    if (!origem) return "";
    const labels: Record<string, string> = {
      meta_form: "Meta Form",
      manual: "Manual",
      whatsapp: "WhatsApp",
      site: "Site",
      indicacao: "Indicação",
    };
    return labels[origem] || origem;
  };

  const rows = leads.map((lead) => [
    lead.nome_completo || "",
    lead.telefone || "",
    lead.email || "",
    lead.volume || "",
    lead.valor_produto?.toString() || "",
    lead.investimento_real?.toString() || "",
    lead.etapa_funil || "",
    getOrigemLabel(lead.origem),
    lead.responsavel_id ? (usersMap[lead.responsavel_id]?.nome_completo || "") : "",
    lead.nota_assessor || "",
    lead.observacoes || "",
    new Date(lead.data_criacao).toLocaleString("pt-BR"),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

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
