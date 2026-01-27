import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";

export interface ColumnVisibility {
  localizacao_embarque: boolean;
  distancia_km: boolean;
  sentido: boolean;
  estrada_terra_km: boolean;
  armazenamento: boolean;
  qualidade: boolean;
  tem_royalties: boolean;
  percentual_royalties: boolean;
}

interface ColumnCustomizerProps {
  visibility: ColumnVisibility;
  onChange: (visibility: ColumnVisibility) => void;
}

const COLUMN_LABELS = {
  localizacao_embarque: "Localização de Embarque",
  distancia_km: "Distância (km)",
  sentido: "Sentido",
  estrada_terra_km: "Estrada de Terra (km)",
  armazenamento: "Armazenamento",
  qualidade: "Qualidade",
  tem_royalties: "Tem Royalties",
  percentual_royalties: "% Royalties",
};

export const ColumnCustomizer = ({ visibility, onChange }: ColumnCustomizerProps) => {
  const [open, setOpen] = useState(false);

  const handleToggle = (column: keyof ColumnVisibility) => {
    onChange({
      ...visibility,
      [column]: !visibility[column],
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Personalizar Colunas</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Colunas Adicionais</h4>
          <div className="space-y-3">
            {Object.entries(COLUMN_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={visibility[key as keyof ColumnVisibility]}
                  onCheckedChange={() => handleToggle(key as keyof ColumnVisibility)}
                />
                <Label
                  htmlFor={key}
                  className="text-sm font-normal cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
