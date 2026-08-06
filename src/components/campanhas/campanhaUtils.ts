import { supabase } from "@/integrations/supabase/client";

export interface CampanhaTemplate {
  id: string;
  name: string;
  body: string | null;
  language: string;
  header_type: string | null;
  header_media_url: string | null;
  variables_example: any;
}

export const formatPhoneForMeta = (raw: string | null | undefined): string => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
};

export const buildTemplateComponents = (
  template: CampanhaTemplate,
): { components: any[]; missingMedia: boolean; missingVars: boolean } => {
  const components: any[] = [];
  let missingMedia = false;
  let missingVars = false;

  const headerType = (template.header_type || "").toUpperCase();
  if (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)) {
    const url = (template.header_media_url || "").trim();
    if (!url) {
      missingMedia = true;
    } else {
      const key = headerType.toLowerCase();
      components.push({
        type: "header",
        parameters: [{ type: key, [key]: { link: url } }],
      });
    }
  }

  const matches = (template.body || "").match(/\{\{\s*\d+\s*\}\}/g) || [];
  const varCount = new Set(matches.map((m) => m.replace(/\D/g, ""))).size;
  if (varCount > 0) {
    const examples: string[] = Array.isArray(template.variables_example)
      ? template.variables_example.map((v: any) => String(v ?? ""))
      : [];
    if (examples.length < varCount) {
      missingVars = true;
    } else {
      components.push({
        type: "body",
        parameters: examples
          .slice(0, varCount)
          .map((t) => ({ type: "text", text: t })),
      });
    }
  }

  return { components, missingMedia, missingVars };
};

export const fetchApprovedTemplates = async (
  accountId: string,
): Promise<CampanhaTemplate[]> => {
  const { data } = await (supabase as any)
    .from("whatsapp_meta_templates")
    .select(
      "id, name, body, language, header_type, header_media_url, variables_example, status",
    )
    .eq("account_id", accountId)
    .ilike("status", "approved")
    .order("name", { ascending: true });
  return (data as CampanhaTemplate[]) || [];
};
