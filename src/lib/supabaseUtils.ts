import { supabase } from "@/integrations/supabase/client";

export async function fetchAllLeads() {
  const pageSize = 1000;
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("data_criacao", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    allData = [...allData, ...(data || [])];
    hasMore = (data?.length || 0) === pageSize;
    from += pageSize;
  }

  const CUTOFF = "2026-06-02";
  return allData.filter((l) => {
    const d = (l.created_time_brasil ?? l.data_criacao ?? "").toString().substring(0, 10);
    return d >= CUTOFF;
  });
}

