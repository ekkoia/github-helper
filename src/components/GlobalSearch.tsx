import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface GlobalSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const GlobalSearch = ({ value, onChange, placeholder = "Buscar leads..." }: GlobalSearchProps) => {
  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 bg-background/50 border-border/50 focus:bg-background"
      />
    </div>
  );
};
