import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeadTag {
  id: string;
  nome: string;
  cor: string;
  emoji: string | null;
  categoria: string | null;
  ordem: number;
  ativo: boolean;
}

export interface LeadTagAssignment {
  id: string;
  lead_id: string;
  tag_id: string;
  atribuido_por: string | null;
  created_at: string;
}

// Catálogo completo (com realtime)
export const useLeadTagsCatalog = (opts: { includeInactive?: boolean } = {}) => {
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    let query = supabase.from("lead_tags" as any).select("*").order("ordem", { ascending: true });
    if (!opts.includeInactive) query = query.eq("ativo", true);
    const { data, error } = await query;
    if (!error && data) setTags(data as unknown as LeadTag[]);
    setLoading(false);
  }, [opts.includeInactive]);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel("lead-tags-catalog")
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_tags" }, () => fetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetch]);

  return { tags, loading, refetch: fetch };
};

// Tags atribuídas a um lead específico
export const useLeadTagsForLead = (leadId: string | null | undefined) => {
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetch = useCallback(async () => {
    if (!leadId) {
      setTagIds([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("lead_tag_assignments" as any)
      .select("tag_id")
      .eq("lead_id", leadId);
    if (!error && data) setTagIds((data as any[]).map((r) => r.tag_id));
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    fetch();
    if (!leadId) return;
    const channel = supabase
      .channel(`lead-tag-assign-${leadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_tag_assignments", filter: `lead_id=eq.${leadId}` },
        () => fetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, fetch]);

  const addTag = async (tagId: string) => {
    if (!leadId) return;
    const { error } = await supabase
      .from("lead_tag_assignments" as any)
      .insert({ lead_id: leadId, tag_id: tagId, atribuido_por: user?.id });
    if (error && !String(error.message).includes("duplicate")) throw error;
  };

  const removeTag = async (tagId: string) => {
    if (!leadId) return;
    const { error } = await supabase
      .from("lead_tag_assignments" as any)
      .delete()
      .eq("lead_id", leadId)
      .eq("tag_id", tagId);
    if (error) throw error;
  };

  return { tagIds, loading, addTag, removeTag, refetch: fetch };
};

// Todas as atribuições (para tabela/kanban) — key: leadId -> tagIds[]
export const useAllLeadTagAssignments = () => {
  const [map, setMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase.from("lead_tag_assignments" as any).select("lead_id, tag_id");
    if (!error && data) {
      const m: Record<string, string[]> = {};
      (data as any[]).forEach((r) => {
        if (!m[r.lead_id]) m[r.lead_id] = [];
        m[r.lead_id].push(r.tag_id);
      });
      setMap(m);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel("lead-tag-assign-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "lead_tag_assignments" }, () => fetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetch]);

  return { map, loading, refetch: fetch };
};
