import { useState } from "react";
import { Plus, X, Tag as TagIcon, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLeadTagsCatalog, useLeadTagsForLead, type LeadTag } from "@/hooks/useLeadTags";

// Utilitário: escurece/clareia cor para contraste do texto
const isDarkColor = (hex: string) => {
  const c = hex.replace("#", "");
  if (c.length !== 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 140;
};

export const TagChip = ({
  tag,
  onRemove,
  size = "sm",
}: {
  tag: LeadTag;
  onRemove?: () => void;
  size?: "xs" | "sm";
}) => {
  const textColor = isDarkColor(tag.cor) ? "#ffffff" : "#111827";
  const px = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${px}`}
      style={{ backgroundColor: tag.cor, color: textColor }}
    >
      {tag.emoji && <span aria-hidden>{tag.emoji}</span>}
      <span className="truncate max-w-[140px]">{tag.nome}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 opacity-70 hover:opacity-100"
          aria-label={`Remover tag ${tag.nome}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

interface LeadTagsSectionProps {
  leadId: string;
  readOnly?: boolean;
  compact?: boolean;
}

export const LeadTagsSection = ({ leadId, readOnly = false, compact = false }: LeadTagsSectionProps) => {
  const { tags: catalog } = useLeadTagsCatalog();
  const { tagIds, addTag, removeTag } = useLeadTagsForLead(leadId);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const assigned = catalog.filter((t) => tagIds.includes(t.id));
  const available = catalog.filter(
    (t) => !tagIds.includes(t.id) && (search === "" || t.nome.toLowerCase().includes(search.toLowerCase())),
  );

  // Agrupa disponíveis por categoria
  const byCategory: Record<string, LeadTag[]> = {};
  available.forEach((t) => {
    const c = t.categoria || "Outros";
    if (!byCategory[c]) byCategory[c] = [];
    byCategory[c].push(t);
  });

  const handleAdd = async (tagId: string) => {
    try {
      await addTag(tagId);
    } catch (e: any) {
      toast.error("Erro ao adicionar tag: " + (e?.message || "desconhecido"));
    }
  };

  const handleRemove = async (tagId: string) => {
    try {
      await removeTag(tagId);
    } catch (e: any) {
      toast.error("Erro ao remover tag: " + (e?.message || "desconhecido"));
    }
  };

  return (
    <div className={compact ? "flex flex-wrap gap-1.5 items-center" : "space-y-2"}>
      {!compact && (
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <TagIcon className="h-4 w-4" />
          Tags
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 items-center">
        {assigned.map((tag) => (
          <TagChip key={tag.id} tag={tag} onRemove={readOnly ? undefined : () => handleRemove(tag.id)} />
        ))}
        {assigned.length === 0 && !readOnly && (
          <span className="text-xs text-muted-foreground">Nenhuma tag</span>
        )}
        {!readOnly && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 px-2 gap-1 text-xs">
                <Plus className="h-3 w-3" />
                Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <Input
                autoFocus
                placeholder="Buscar tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm mb-2"
              />
              <div className="max-h-64 overflow-y-auto space-y-3">
                {Object.keys(byCategory).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {catalog.length === 0 ? "Nenhuma tag cadastrada" : "Todas as tags já foram adicionadas"}
                  </p>
                )}
                {Object.entries(byCategory).map(([cat, list]) => (
                  <div key={cat}>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 px-1">{cat}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => handleAdd(tag.id)}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <TagChip tag={tag} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
