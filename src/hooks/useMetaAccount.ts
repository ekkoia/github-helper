import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MetaAccount {
  id: string;
  phone_number_id: string;
  access_token: string;
  api_version: string;
  waba_id: string;
  account_name: string | null;
}

let cachedMetaAccount: MetaAccount | null = null;
let hasFetchedMetaAccount = false;

export const useMetaAccount = () => {
  const { user } = useAuth();
  const [account, setAccount] = useState<MetaAccount | null>(cachedMetaAccount);
  const [loading, setLoading] = useState(!hasFetchedMetaAccount);

  useEffect(() => {
    if (!user?.id) return;

    const fetch = async () => {
      setLoading(!hasFetchedMetaAccount);
      // Conta Meta compartilhada: usa a primeira (e única) configurada por um global admin.
      const { data } = await (supabase as any)
        .from("whatsapp_meta_accounts")
        .select("id, phone_number_id, access_token, api_version, waba_id, account_name")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      cachedMetaAccount = data || null;
      hasFetchedMetaAccount = true;
      setAccount(cachedMetaAccount);
      setLoading(false);
    };

    fetch();
  }, [user?.id]);

  return { account, loading };
};
