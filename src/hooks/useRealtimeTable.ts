import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface Options {
  /** Nome da tabela (schema public) */
  table: string;
  /** Evento a ouvir. Default: '*'. */
  event?: RealtimeEvent;
  /** Filtro postgres (ex.: `user_id=eq.${id}`). Opcional. */
  filter?: string;
  /** Chave única do canal (evita duplicação). */
  channelKey?: string;
  /** Debounce em ms para agrupar rajadas de eventos. Default: 400. */
  debounceMs?: number;
  /** Desabilita a assinatura (ex.: user ainda não carregado). */
  enabled?: boolean;
}

/**
 * Assina mudanças em uma tabela do Supabase e chama `onChange` (debounced).
 * Sempre desinscreve no cleanup — seguro para uso em qualquer página.
 */
export const useRealtimeTable = (onChange: () => void, opts: Options) => {
  const {
    table,
    event = "*",
    filter,
    channelKey,
    debounceMs = 400,
    enabled = true,
  } = opts;

  const cbRef = useRef(onChange);
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(), debounceMs);
    };

    const name = `rt-${table}-${channelKey ?? "default"}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    const cfg: any = { event, schema: "public", table };
    if (filter) cfg.filter = filter;

    const channel = supabase
      .channel(name)
      .on("postgres_changes", cfg, () => trigger())
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, channelKey, debounceMs, enabled]);
};

/**
 * Faz polling do callback a cada `intervalMs`, pausando quando a aba está oculta.
 */
export const useVisiblePolling = (
  onTick: () => void,
  intervalMs: number = 60_000,
  enabled: boolean = true,
) => {
  const cbRef = useRef(onTick);
  useEffect(() => {
    cbRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => cbRef.current(), intervalMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        cbRef.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [intervalMs, enabled]);
};
