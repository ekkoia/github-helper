import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  TARGET_FIELDS,
  type TargetField,
  type ColumnMapping,
  type ParsedFile,
  type ValidatedRow,
  parseFile,
  autoMapColumns,
  validateRow,
  downloadTemplate,
  downloadErrorReport,
} from "@/lib/importUtils";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const MAX_ROWS = 5000;
const MAX_SIZE_MB = 5;
const BATCH_SIZE = 100;

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

export const ImportLeadsDialog = ({ open, onOpenChange, onImported }: ImportLeadsDialogProps) => {
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validated, setValidated] = useState<ValidatedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<{ created: number; merged: number; errors: number } | null>(null);
  const [errorRows, setErrorRows] = useState<ValidatedRow[]>([]);
  const { etapasNomes } = useFunilEtapas();

  useEffect(() => {
    if (!open) {
      // reset on close
      setTimeout(() => {
        setStep("upload");
        setParsed(null);
        setMapping({});
        setValidated([]);
        setProgress(0);
        setSummary(null);
        setErrorRows([]);
      }, 300);
    }
  }, [open]);

  const handleFile = async (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo maior que ${MAX_SIZE_MB} MB`);
      return;
    }
    try {
      const data = await parseFile(file);
      if (data.rows.length === 0) {
        toast.error("Planilha vazia");
        return;
      }
      if (data.rows.length > MAX_ROWS) {
        toast.error(`Máximo ${MAX_ROWS} linhas por importação`);
        return;
      }
      setParsed(data);
      setMapping(autoMapColumns(data.headers));
      setStep("mapping");
    } catch (e: any) {
      toast.error("Erro ao ler arquivo: " + (e?.message || "desconhecido"));
    }
  };

  const validateAll = async () => {
    if (!parsed) return;

    // Fetch existing emails/phones for dedup hint
    const emails = new Set<string>();
    const phones = new Set<string>();
    try {
      const { data } = await supabase.from("leads").select("email,telefone").limit(10000);
      (data || []).forEach((r: any) => {
        if (r.email) emails.add(String(r.email).toLowerCase().trim());
        if (r.telefone) phones.add(String(r.telefone).replace(/[^0-9]/g, ""));
      });
    } catch (e) {
      console.warn("Could not preload dedup keys", e);
    }

    const results = parsed.rows.map((row, i) =>
      validateRow(row, mapping, i, etapasNomes, { emails, phones })
    );
    setValidated(results);
    setStep("preview");
  };

  const counts = useMemo(() => {
    return {
      valid: validated.filter((r) => r.status === "valid").length,
      duplicate: validated.filter((r) => r.status === "duplicate").length,
      invalid: validated.filter((r) => r.status === "invalid").length,
    };
  }, [validated]);

  const requiredMapped = useMemo(() => {
    const mapped = new Set(Object.values(mapping));
    return TARGET_FIELDS.filter((f) => f.required).every((f) => mapped.has(f.key as TargetField));
  }, [mapping]);

  // Detect potentially malformed phone column (sample first 5 rows)
  const phoneWarning = useMemo(() => {
    if (!parsed) return null;
    const phoneHeader = Object.entries(mapping).find(([, t]) => t === "telefone")?.[0];
    if (!phoneHeader) return null;
    const samples = parsed.rows.slice(0, 5).map((r) => String(r[phoneHeader] ?? ""));
    const shortCount = samples.filter((s) => {
      const digits = s.replace(/\D/g, "").replace(/^0+/, "");
      const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
      return local.length > 0 && local.length < 10;
    }).length;
    if (shortCount >= Math.ceil(samples.length / 2)) {
      return "Os telefones do arquivo parecem estar sem DDD ou foram lidos como número pelo Excel. Linhas inválidas serão bloqueadas. Reformate a coluna como Texto e inclua o DDD.";
    }
    return null;
  }, [parsed, mapping]);


  const startImport = async () => {
    const toImport = validated.filter((r) => r.status !== "invalid");
    if (toImport.length === 0) {
      toast.error("Nenhuma linha válida para importar");
      return;
    }
    setStep("importing");
    setProgress(0);

    let created = 0;
    let merged = 0;
    let errors = 0;
    const errorList: ValidatedRow[] = [];

    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
      const batch = toImport.slice(i, i + BATCH_SIZE).map((r) => ({
        index: r.index,
        ...r.data,
      }));

      try {
        const { data, error } = await supabase.functions.invoke("import-leads-bulk", {
          body: { leads: batch, origem_default: "importacao_planilha" },
        });
        if (error) throw error;
        const res = data as { summary: any; results: any[] };
        created += res.summary.created;
        merged += res.summary.merged;
        errors += res.summary.errors;
        res.results.filter((r) => r.status === "error").forEach((r) => {
          const orig = toImport.find((v) => v.index === r.index);
          if (orig) errorList.push({ ...orig, errors: [r.error || "Erro"] });
        });
      } catch (e: any) {
        errors += batch.length;
        toast.error("Erro no lote: " + (e?.message || "desconhecido"));
      }

      setProgress(Math.round(((i + batch.length) / toImport.length) * 100));
    }

    // Add originally-invalid rows to error report
    validated.filter((r) => r.status === "invalid").forEach((r) => errorList.push(r));

    setSummary({ created, merged, errors });
    setErrorRows(errorList);
    setStep("done");
    onImported();
    toast.success(`Importação concluída: ${created} novos, ${merged} mesclados, ${errors} erros`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar leads via planilha</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Envie um arquivo CSV ou XLSX com seus leads"}
            {step === "mapping" && "Confirme o mapeamento das colunas"}
            {step === "preview" && "Revise os dados antes de importar"}
            {step === "importing" && "Importando..."}
            {step === "done" && "Importação concluída"}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <label
              htmlFor="import-file"
              className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Clique para selecionar um arquivo</p>
              <p className="text-sm text-muted-foreground mt-1">CSV ou XLSX, até {MAX_SIZE_MB} MB / {MAX_ROWS} linhas</p>
              <input
                id="import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Não tem um modelo?</span>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar template
              </Button>
            </div>
          </div>
        )}

        {step === "mapping" && parsed && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {parsed.rows.length} linhas detectadas. Associe cada coluna do seu arquivo a um campo do CRM.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coluna no arquivo</TableHead>
                    <TableHead>Campo no CRM</TableHead>
                    <TableHead>Exemplo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.headers.map((h) => (
                    <TableRow key={h}>
                      <TableCell className="font-medium">{h}</TableCell>
                      <TableCell>
                        <Select
                          value={mapping[h] || "ignore"}
                          onValueChange={(v) => setMapping({ ...mapping, [h]: v as TargetField | "ignore" })}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">— Ignorar —</SelectItem>
                            {TARGET_FIELDS.map((f) => (
                              <SelectItem key={f.key} value={f.key}>
                                {f.label} {f.required && "*"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {String(parsed.rows[0]?.[h] ?? "").slice(0, 40)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!requiredMapped && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Mapeie os campos obrigatórios: Nome, Telefone e Email.
              </div>
            )}
            {phoneWarning && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded p-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{phoneWarning}</span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={validateAll} disabled={!requiredMapped}>
                Validar e visualizar
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded-lg p-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{counts.valid}</p>
                  <p className="text-xs text-muted-foreground">Novas (serão criadas)</p>
                </div>
              </div>
              <div className="border rounded-lg p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">{counts.duplicate}</p>
                  <p className="text-xs text-muted-foreground">Duplicadas (mescladas)</p>
                </div>
              </div>
              <div className="border rounded-lg p-3 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{counts.invalid}</p>
                  <p className="text-xs text-muted-foreground">Inválidas (ignoradas)</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validated.slice(0, 50).map((r) => (
                    <TableRow key={r.index}>
                      <TableCell>{r.index + 2}</TableCell>
                      <TableCell>
                        {r.status === "valid" && <Badge className="bg-green-600">Nova</Badge>}
                        {r.status === "duplicate" && <Badge variant="secondary">Duplicada</Badge>}
                        {r.status === "invalid" && <Badge variant="destructive">Inválida</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">{r.data.nome_completo || "—"}</TableCell>
                      <TableCell className="text-sm">{r.data.email || "—"}</TableCell>
                      <TableCell className="text-sm">{r.data.telefone || "—"}</TableCell>
                      <TableCell className="text-xs text-destructive">{r.errors.join("; ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {validated.length > 50 && (
              <p className="text-xs text-muted-foreground text-center">
                Mostrando 50 de {validated.length} linhas
              </p>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep("mapping")}>Voltar</Button>
              <Button onClick={startImport} disabled={counts.valid + counts.duplicate === 0}>
                Importar {counts.valid + counts.duplicate} leads
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-8">
            <FileSpreadsheet className="h-12 w-12 text-primary mx-auto animate-pulse" />
            <p className="text-center text-sm text-muted-foreground">Importando leads em lotes...</p>
            <Progress value={progress} />
            <p className="text-center text-sm font-medium">{progress}%</p>
          </div>
        )}

        {step === "done" && summary && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">Importação concluída!</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{summary.created}</p>
                <p className="text-xs text-muted-foreground">Criados</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{summary.merged}</p>
                <p className="text-xs text-muted-foreground">Mesclados</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{summary.errors}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>
            <div className="flex justify-between gap-2">
              {errorRows.length > 0 && (
                <Button variant="outline" onClick={() => downloadErrorReport(errorRows)} className="gap-2">
                  <Download className="h-4 w-4" />
                  Baixar relatório de erros
                </Button>
              )}
              <Button onClick={() => onOpenChange(false)} className="ml-auto">Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
