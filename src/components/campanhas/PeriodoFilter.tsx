import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PeriodoValue } from "./dateFilter";

interface PeriodoFilterProps {
  periodo: PeriodoValue;
  onPeriodoChange: (value: PeriodoValue) => void;
  dataInicio?: Date;
  dataFim?: Date;
  onDataInicioChange: (date?: Date) => void;
  onDataFimChange: (date?: Date) => void;
  className?: string;
}

export const PeriodoFilter = ({
  periodo,
  onPeriodoChange,
  dataInicio,
  dataFim,
  onDataInicioChange,
  onDataFimChange,
  className,
}: PeriodoFilterProps) => {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-2 sm:items-center", className)}>
      <Select value={periodo} onValueChange={(v) => onPeriodoChange(v as PeriodoValue)}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo o período</SelectItem>
          <SelectItem value="hoje">Hoje</SelectItem>
          <SelectItem value="ontem">Ontem</SelectItem>
          <SelectItem value="7">Últimos 7 dias</SelectItem>
          <SelectItem value="15">Últimos 15 dias</SelectItem>
          <SelectItem value="30">Últimos 30 dias</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {periodo === "custom" && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[150px] justify-start text-left font-normal",
                  !dataInicio && "text-muted-foreground",
                )}
              >
                {dataInicio
                  ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR })
                  : "dd/mm/aaaa"}
                <CalendarIcon className="ml-auto h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataInicio}
                onSelect={onDataInicioChange}
                initialFocus
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[150px] justify-start text-left font-normal",
                  !dataFim && "text-muted-foreground",
                )}
              >
                {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                <CalendarIcon className="ml-auto h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataFim}
                onSelect={onDataFimChange}
                initialFocus
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};
