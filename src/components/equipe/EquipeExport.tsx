import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, exportToXLSX } from "@/lib/exportUtils";

interface EquipeExportProps {
  leads: any[];
  usersMap: Record<string, { user_id: string; nome_completo: string | null; email: string | null; avatar_url: string | null }>;
}

export const EquipeExport = ({ leads, usersMap }: EquipeExportProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            className="justify-start gap-2 text-sm"
            onClick={() => exportToCSV(leads, usersMap, "equipe-leads.csv")}
          >
            <FileText className="h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 text-sm"
            onClick={() => exportToXLSX(leads, usersMap, "equipe-leads.xlsx")}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel (XLSX)
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
