import { useEffect, useRef } from "react";
import { toast } from "sonner";

const VERSION_URL = "/version.json";
const POLL_INTERVAL_MS = 60_000;
const MAX_DEFER_MS = 5 * 60_000;
const FAILURE_BACKOFF_MS = 5 * 60_000;

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return typeof data?.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

function hasUnsavedInput(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (
    active &&
    (active.tagName === "TEXTAREA" || active.tagName === "INPUT") &&
    "value" in active &&
    typeof (active as HTMLInputElement).value === "string" &&
    (active as HTMLInputElement).value.trim().length > 0
  ) {
    return true;
  }
  // Also check chat composer textareas even if not focused
  const composers = document.querySelectorAll<HTMLTextAreaElement>(
    'textarea[data-chat-composer="true"], textarea[placeholder*="mensagem" i]'
  );
  for (const el of composers) {
    if (el.value && el.value.trim().length > 0) return true;
  }
  return false;
}

/**
 * Detects a new deployed frontend version and triggers a reload
 * so users don't stay on stale code. Runs once for the whole app.
 */
export function useVersionCheck() {
  const currentVersion = useRef<string | null>(null);
  const reloading = useRef(false);
  const consecutiveFailures = useRef(0);
  const pausedUntil = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const scheduleReload = (nextVersion: string) => {
      if (reloading.current) return;
      reloading.current = true;

      const doReload = () => {
        try {
          window.location.reload();
        } catch {
          window.location.href = window.location.href;
        }
      };

      const deferred = hasUnsavedInput();
      if (deferred) {
        toast.message("Nova versão disponível", {
          description:
            "Termine sua mensagem — atualizaremos em breve. Clique para atualizar agora.",
          duration: MAX_DEFER_MS,
          action: {
            label: "Atualizar agora",
            onClick: doReload,
          },
        });
        window.setTimeout(doReload, MAX_DEFER_MS);
      } else {
        toast.message("Nova versão disponível", {
          description: "Atualizando o aplicativo…",
          duration: 2000,
        });
        window.setTimeout(doReload, 1500);
      }

      // Prevent further checks
      currentVersion.current = nextVersion;
    };

    const check = async () => {
      if (cancelled || reloading.current) return;
      if (Date.now() < pausedUntil.current) return;

      const v = await fetchVersion();
      if (v == null) {
        consecutiveFailures.current += 1;
        if (consecutiveFailures.current >= 3) {
          pausedUntil.current = Date.now() + FAILURE_BACKOFF_MS;
          consecutiveFailures.current = 0;
        }
        return;
      }
      consecutiveFailures.current = 0;

      if (currentVersion.current == null) {
        currentVersion.current = v;
        return;
      }
      if (v !== currentVersion.current && v !== "dev") {
        scheduleReload(v);
      }
    };

    // Initial fetch (baseline) then poll
    check();
    timer = window.setInterval(check, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
