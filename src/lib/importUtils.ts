import * as XLSX from "xlsx";

export const TARGET_FIELDS: ReadonlyArray<{ key: string; label: string; required?: boolean }> = [
  { key: "nome_completo", label: "Nome Completo", required: true },
  { key: "telefone", label: "Telefone", required: true },
  { key: "email", label: "Email", required: true },
  { key: "perfil", label: "Perfil" },
  { key: "intencao", label: "Intenção" },
  { key: "tipo_grao", label: "Tipo de Grão" },
  { key: "volume", label: "Volume / Cotas" },
  { key: "valor_produto", label: "Valor Investido" },
  { key: "cidade", label: "Cidade" },
  { key: "uf", label: "UF" },
  { key: "etapa_funil", label: "Etapa do Funil" },
  { key: "origem", label: "Origem" },
  { key: "observacoes", label: "Observações" },
  { key: "nota_assessor", label: "Nota do Assessor" },
] as const;

export type TargetField =
  | "nome_completo" | "telefone" | "email" | "perfil" | "intencao"
  | "tipo_grao" | "volume" | "valor_produto" | "cidade" | "uf"
  | "etapa_funil" | "origem" | "observacoes" | "nota_assessor";

export type ColumnMapping = Record<string, TargetField | "ignore">;

export interface ParsedFile {
  headers: string[];
  rows: Record<string, any>[];
}

export interface ValidatedRow {
  index: number;
  data: Partial<Record<TargetField, any>>;
  status: "valid" | "duplicate" | "invalid";
  errors: string[];
  raw: Record<string, any>;
}

const norm = (s: string) =>
  s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const HEADER_ALIASES: Record<TargetField, string[]> = {
  nome_completo: ["nome", "nome completo", "name", "full name", "lead", "cliente"],
  telefone: ["telefone", "phone", "celular", "whatsapp", "fone", "tel"],
  email: ["email", "e-mail", "mail"],
  perfil: ["perfil", "profile"],
  intencao: ["intencao", "intenção", "intent"],
  tipo_grao: ["tipo grao", "tipo de grao", "grao", "grain"],
  volume: ["volume", "cotas", "qtd cotas", "quantidade"],
  valor_produto: ["valor", "valor investido", "investimento", "valor produto", "valor_produto"],
  cidade: ["cidade", "city"],
  uf: ["uf", "estado", "state"],
  etapa_funil: ["etapa", "etapa funil", "etapa do funil", "stage", "status"],
  origem: ["origem", "source", "fonte"],
  observacoes: ["observacoes", "observações", "obs", "notes", "notas"],
  nota_assessor: ["nota assessor", "nota do assessor", "assessor"],
};

export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const h of headers) {
    const nh = norm(h);
    let matched: TargetField | "ignore" = "ignore";
    for (const field of TARGET_FIELDS) {
      const aliases = HEADER_ALIASES[field.key as TargetField] || [];
      if (aliases.some((a) => norm(a) === nh) || norm(field.key) === nh || norm(field.label) === nh) {
        matched = field.key as TargetField;
        break;
      }
    }
    mapping[h] = matched;
  }
  return mapping;
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", raw: false });
  const headers = json.length > 0 ? Object.keys(json[0]) : [];
  return { headers, rows: json };
}

export function parseValorInvestido(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const s = String(value).toLowerCase().trim();
  const faixas: Record<string, number> = {
    "ate r$10 mil": 10000,
    "até r$10 mil": 10000,
    "ate 10 mil": 10000,
    "de r$10 mil a r$50 mil": 50000,
    "de 10 mil a 50 mil": 50000,
    "de r$50 mil a r$100 mil": 100000,
    "de 50 mil a 100 mil": 100000,
    "acima de r$100 mil": 150000,
    "acima de 100 mil": 150000,
  };
  for (const [k, v] of Object.entries(faixas)) {
    if (s.includes(k)) return v;
  }
  const num = parseFloat(s.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(num) ? null : num;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalize a phone value coming from a spreadsheet.
 * Handles scientific notation (e.g. "1.1e+10"), masks, spaces and DDI.
 * Returns digits only and an E.164-style version with DDI 55 (Brazil).
 */
export function normalizePhone(value: any): { digits: string; e164: string; valid: boolean } {
  if (value === null || value === undefined) return { digits: "", e164: "", valid: false };
  let s = String(value).trim();

  // Expand scientific notation like "1.1e+10" or "5.511999999999e+12"
  if (/e[+-]?\d+/i.test(s)) {
    const n = Number(s);
    if (!isNaN(n)) {
      // Use toFixed(0) to avoid further scientific notation
      s = n.toFixed(0);
    }
  }

  // Keep only digits
  let digits = s.replace(/\D/g, "");

  // Strip leading zeros (e.g. "011..." -> "11...")
  digits = digits.replace(/^0+/, "");

  // If it already starts with 55 and has 12-13 digits, treat as full E.164
  let local = digits;
  if (digits.length >= 12 && digits.startsWith("55")) {
    local = digits.slice(2);
  }

  // Local must be 10 (fixed) or 11 (mobile) digits = DDD + 8/9
  const valid = local.length === 10 || local.length === 11;
  const e164 = valid ? `55${local}` : digits;

  return { digits: valid ? local : digits, e164, valid };
}

export function validateRow(
  raw: Record<string, any>,
  mapping: ColumnMapping,
  index: number,
  validEtapas: string[],
  existingKeys: { emails: Set<string>; phones: Set<string> }
): ValidatedRow {
  const data: Partial<Record<TargetField, any>> = {};
  const errors: string[] = [];

  for (const [src, target] of Object.entries(mapping)) {
    if (target === "ignore") continue;
    const v = raw[src];
    if (v === undefined || v === null || v === "") continue;
    if (target === "valor_produto") {
      data.valor_produto = parseValorInvestido(v);
    } else if (target === "telefone") {
      data.telefone = String(v).trim();
    } else if (target === "email") {
      data.email = String(v).trim().toLowerCase();
    } else {
      (data as any)[target] = String(v).trim();
    }
  }

  if (!data.nome_completo) errors.push("Nome obrigatório");
  if (!data.telefone) errors.push("Telefone obrigatório");
  if (!data.email) errors.push("Email obrigatório");
  if (data.email && !emailRe.test(data.email as string)) errors.push("Email inválido");
  if (data.etapa_funil && !validEtapas.includes(data.etapa_funil as string)) {
    errors.push(`Etapa inválida: "${data.etapa_funil}"`);
  }

  let status: ValidatedRow["status"] = "valid";
  if (errors.length > 0) {
    status = "invalid";
  } else {
    const phoneNorm = (data.telefone as string).replace(/[^0-9]/g, "");
    const emailNorm = data.email as string;
    if (existingKeys.emails.has(emailNorm) || existingKeys.phones.has(phoneNorm)) {
      status = "duplicate";
    }
  }

  return { index, data, status, errors, raw };
}

export function downloadTemplate() {
  const headers = TARGET_FIELDS.map((f) => f.label);
  const example = [
    "João da Silva",
    "11999999999",
    "joao@example.com",
    "Produtor",
    "Vender",
    "Soja",
    "1000",
    "50000",
    "Cuiabá",
    "MT",
    "Novo Lead",
    "indicacao",
    "Cliente indicado por parceiro",
    "",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "template_importacao_leads.xlsx");
}

export function downloadErrorReport(rows: ValidatedRow[]) {
  const data = [
    ["Linha", "Status", "Erros", "Nome", "Telefone", "Email"],
    ...rows.map((r) => [
      r.index + 2, // +2 because row 1 is header in spreadsheet
      r.status,
      r.errors.join("; "),
      r.data.nome_completo || "",
      r.data.telefone || "",
      r.data.email || "",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Erros");
  XLSX.writeFile(wb, `relatorio_importacao_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
