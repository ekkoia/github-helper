import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RodizioUser {
  id: string;
  user_id: string;
  ativo: boolean;
  ordem: number;
  nome_completo?: string;
  email?: string;
}

export const useRodizio = () => {
  const [config, setConfig] = useState<RodizioUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("rodizio_config")
      .select("id, user_id, ativo, ordem")
      .order("ordem", { ascending: true });

    if (error) { console.error(error); setLoading(false); return; }

    // Busca nomes dos assessores
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("user_id, nome_completo, email");

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    setConfig((data || []).map((row: any) => ({
      ...row,
      nome_completo: profileMap.get(row.user_id)?.nome_completo || "",
      email: profileMap.get(row.user_id)?.email || "",
    })));
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const addUser = async (userId: string) => {
    const maxOrdem = config.length > 0 ? Math.max(...config.map(c => c.ordem)) : -1;
    const { error } = await (supabase as any)
      .from("rodizio_config")
      .upsert({ user_id: userId, ativo: true, ordem: maxOrdem + 1 }, { onConflict: "user_id" });
    if (error) { toast.error("Erro ao adicionar assessor"); return false; }
    await fetch();
    return true;
  };

  const removeUser = async (id: string) => {
    const { error } = await (supabase as any)
      .from("rodizio_config")
      .delete()
      .eq("id", id);
    if (error) { toast.error("Erro ao remover assessor"); return false; }
    await fetch();
    return true;
  };

  const toggleUser = async (id: string, ativo: boolean) => {
    const { error } = await (supabase as any)
      .from("rodizio_config")
      .update({ ativo })
      .eq("id", id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    setConfig(prev => prev.map(c => c.id === id ? { ...c, ativo } : c));
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const newConfig = [...config];
    [newConfig[index - 1], newConfig[index]] = [newConfig[index], newConfig[index - 1]];
    await Promise.all(newConfig.map((c, i) =>
      (supabase as any).from("rodizio_config").update({ ordem: i }).eq("id", c.id)
    ));
    await fetch();
  };

  const moveDown = async (index: number) => {
    if (index === config.length - 1) return;
    const newConfig = [...config];
    [newConfig[index], newConfig[index + 1]] = [newConfig[index + 1], newConfig[index]];
    await Promise.all(newConfig.map((c, i) =>
      (supabase as any).from("rodizio_config").update({ ordem: i }).eq("id", c.id)
    ));
    await fetch();
  };

  return { config, loading, addUser, removeUser, toggleUser, moveUp, moveDown, refetch: fetch };
};
