export type PeriodoValue =
  | "all"
  | "hoje"
  | "ontem"
  | "7"
  | "15"
  | "30"
  | "custom";

export interface PeriodoRange {
  start: Date | null;
  end: Date | null;
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

export const getPeriodoRange = (
  periodo: PeriodoValue,
  dataInicio?: Date,
  dataFim?: Date,
): PeriodoRange => {
  const hoje = new Date();

  switch (periodo) {
    case "hoje":
      return { start: startOfDay(hoje), end: endOfDay(hoje) };
    case "ontem": {
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      return { start: startOfDay(ontem), end: endOfDay(ontem) };
    }
    case "7":
    case "15":
    case "30": {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - Number(periodo));
      return { start: startOfDay(inicio), end: endOfDay(hoje) };
    }
    case "custom":
      return {
        start: dataInicio ? startOfDay(dataInicio) : null,
        end: dataFim ? endOfDay(dataFim) : null,
      };
    default:
      return { start: null, end: null };
  }
};

export const isWithinPeriodo = (
  isoDate: string | null | undefined,
  range: PeriodoRange,
): boolean => {
  if (!range.start && !range.end) return true;
  if (!isoDate) return false;
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return false;
  if (range.start && t < range.start.getTime()) return false;
  if (range.end && t > range.end.getTime()) return false;
  return true;
};
