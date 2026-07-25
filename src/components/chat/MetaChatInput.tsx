import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Send, Clock, AlertCircle, Paperclip, X, FileText,
  Image, Video, Music, Mic, Square, Trash2, Check, Smile,
} from "lucide-react";
import EmojiPicker, { EmojiStyle, Theme as EmojiTheme } from "emoji-picker-react";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppAudioPlayer from "./WhatsAppAudioPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { MetaAccount } from "@/hooks/useMetaAccount";
import { ChatMessage } from "@/hooks/useChatMessages";
import { toast } from "sonner";

interface MetaChatInputProps {
  contactPhone: string;
  contactName: string;
  metaAccount: MetaAccount;
  initialWindowOpen?: boolean;
  onMessageSent: () => void;
  addOptimistic?: (msg: ChatMessage) => void;
  updateOptimistic?: (tempId: string, patch: Partial<ChatMessage>) => void;
  removeOptimistic?: (tempId: string) => void;
}


interface MetaTemplate {
  id: string;
  name: string;
  body: string;
  language: string;
  header_type?: string | null;
  header_media_url?: string | null;
  variables_example?: any;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/3gpp"],
  audio: ["audio/aac", "audio/mp4", "audio/mpeg", "audio/amr", "audio/ogg"],
  document: [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ],
};

const ALL_ACCEPTED = Object.values(ACCEPTED_TYPES).flat().join(",");

const formatPhoneForMeta = (raw: string | null | undefined): string => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
};

const getMediaType = (mime: string): string => {
  for (const [type, mimes] of Object.entries(ACCEPTED_TYPES)) {
    if (mimes.includes(mime)) return type;
  }
  return "document";
};

const MediaTypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
  switch (type) {
    case "image": return <Image className={className} />;
    case "video": return <Video className={className} />;
    case "audio": return <Music className={className} />;
    default: return <FileText className={className} />;
  }
};

const ENCODER_WORKER_URL = "/encoderWorker.min.js";

const MetaChatInput: React.FC<MetaChatInputProps> = ({
  contactPhone, contactName, metaAccount, initialWindowOpen = false, onMessageSent,
  addOptimistic, updateOptimistic, removeOptimistic,
}) => {

  const fallbackPhone = formatPhoneForMeta(contactPhone);
  const [resolvedRecipient, setResolvedRecipient] = useState<{ contactPhone: string; phone: string } | null>(null);
  const cleanPhone = resolvedRecipient?.contactPhone === contactPhone ? resolvedRecipient.phone : fallbackPhone;
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [isWithin24h, setIsWithin24h] = useState(initialWindowOpen);
  const [windowExpiresAt, setWindowExpiresAt] = useState<Date | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [ecosystemBlocks, setEcosystemBlocks] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const { theme } = useTheme();
  const emojiTheme: EmojiTheme = (() => {
    if (theme === "dark") return EmojiTheme.DARK;
    if (theme === "light") return EmojiTheme.LIGHT;
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? EmojiTheme.DARK
      : EmojiTheme.LIGHT;
  })();

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) { setMessage((m) => m + emoji); return; }
    const start = ta.selectionStart ?? message.length;
    const end = ta.selectionEnd ?? message.length;
    const next = message.slice(0, start) + emoji + message.slice(end);
    setMessage(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (recordedUrl) URL.revokeObjectURL(recordedUrl); };
  }, [recordedUrl]);

  // Candidatos de telefone (com/sem 9º dígito) para consultar a janela na Meta
  const windowCandidates = React.useMemo(() => {
    const rawDigits = contactPhone.replace(/\D/g, "");
    const withDDI = rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`;
    const set = new Set<string>([fallbackPhone, withDDI]);
    if (withDDI.length === 13 && withDDI[4] === "9") {
      set.add(withDDI.slice(0, 4) + withDDI.slice(5));
    }
    if (withDDI.length === 12) {
      set.add(withDDI.slice(0, 4) + "9" + withDDI.slice(4));
    }
    return Array.from(set).filter(Boolean);
  }, [contactPhone, fallbackPhone]);

  const refreshWindow = React.useCallback(async (extra?: string[]) => {
    try {
      const list = Array.from(new Set([...windowCandidates, ...(extra || [])])).filter(Boolean);
      if (list.length === 0) return;
      const { data: wins } = await (supabase as any)
        .from("whatsapp_conversation_windows")
        .select("phone_e164, expires_at")
        .in("phone_e164", list);
      const win = (wins || [])
        .filter((w: any) => w.expires_at)
        .sort((a: any, b: any) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0];
      if (win?.expires_at) {
        const exp = new Date(win.expires_at);
        setWindowExpiresAt(exp);
        setIsWithin24h(exp.getTime() > Date.now());
      } else {
        setWindowExpiresAt(null);
        setIsWithin24h(false);
      }
    } catch (err) {
      console.error("Erro ao atualizar janela 24h:", err);
    }
  }, [windowCandidates]);

  useEffect(() => {
    const init = async () => {
      setIsWithin24h(initialWindowOpen);
      try {
        let metaRecipient = fallbackPhone;
        const rawDigits = contactPhone.replace(/\D/g, "");
        const withDDI = rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`;
        const last8 = withDDI.slice(-8);

        if (last8) {
          const { data: linkedLead } = await (supabase as any)
            .from("leads")
            .select("telefone")
            .like("telefone", `%${last8}`)
            .order("data_atualizacao", { ascending: false })
            .limit(1)
            .maybeSingle();
          const leadPhone = formatPhoneForMeta(linkedLead?.telefone);
          if (leadPhone) metaRecipient = leadPhone;
        }
        setResolvedRecipient({ contactPhone, phone: metaRecipient });

        // Buscar templates aprovados
        const { data: tpls } = await (supabase as any)
          .from("whatsapp_meta_templates")
          .select("id, name, body, language, header_type, header_media_url, variables_example")
          .eq("account_id", metaAccount.id)
          .eq("status", "approved");
        setTemplates(tpls || []);

        // Fonte da verdade: tabela whatsapp_conversation_windows alimentada
        // pelo webhook (status oficial da Meta) e por triggers de inbound.
        await refreshWindow([metaRecipient]);

        // Detecta bloqueios da Meta ("ecosystem engagement") nos últimos 30 dias
        const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        const { count: blockCount } = await (supabase as any)
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("message_direction", "outbound")
          .eq("delivery_status", "failed")
          .ilike("failure_reason", "%ecosystem engagement%")
          .like("phone", `%${last8}`)
          .gte("created_at", cutoff);
        setEcosystemBlocks(blockCount || 0);
      } catch (err) {
        console.error("Erro ao inicializar MetaChatInput:", err);
      }
    };
    init();
  }, [contactPhone, fallbackPhone, initialWindowOpen, metaAccount.id, refreshWindow]);

  // Realtime: reabre/atualiza a janela de 24h assim que o webhook grava
  // uma mudança em whatsapp_conversation_windows ou chega um inbound.
  useEffect(() => {
    if (windowCandidates.length === 0) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => refreshWindow(), 250);
    };
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const chWin = supabase
      .channel(`rt-window-${suffix}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversation_windows" },
        (payload: any) => {
          const p = (payload?.new?.phone_e164 || payload?.old?.phone_e164 || "") as string;
          if (!p || windowCandidates.includes(p)) trigger();
        }
      )
      .subscribe();
    const chMsg = supabase
      .channel(`rt-inbound-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const row = payload?.new || {};
          if (row.message_direction !== "inbound") return;
          const digits = String(row.phone || "").replace(/\D/g, "");
          if (!digits) return;
          const last8 = digits.slice(-8);
          if (windowCandidates.some((c) => c.endsWith(last8))) trigger();
        }
      )
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(chWin);
      supabase.removeChannel(chMsg);
    };
  }, [windowCandidates, refreshWindow]);


  const makeTimestamp = () => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")} ${String(now.getHours()).padStart(2, "00")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const formatSeconds = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const startRecording = async () => {
    try {
      if (!(window as any).Recorder) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "/recorder.min.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Falha ao carregar recorder"));
          document.head.appendChild(s);
        });
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new (window as any).Recorder({
        encoderPath: ENCODER_WORKER_URL,
        encoderApplication: 2048,
        encoderSampleRate: 16000,
        numberOfChannels: 1,
        streamPages: false,
      });
      recorder.ondataavailable = (arrayBuffer: ArrayBuffer) => {
        const blob = new Blob([arrayBuffer], { type: "audio/ogg" });
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
      };
      await recorder.start(stream);
      recorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err: any) {
      toast.error("Não foi possível iniciar gravação: " + (err.message || ""));
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const discardRecording = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingSeconds(0);
  };

  const uploadMediaToMeta = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("messaging_product", "whatsapp");
    formData.append("type", file.type);
    try {
      const res = await fetch(
        `https://graph.facebook.com/${metaAccount.api_version}/${metaAccount.phone_number_id}/media`,
        { method: "POST", headers: { Authorization: `Bearer ${metaAccount.access_token}` }, body: formData }
      );
      const json = await res.json();
      if (json.id) return json.id;
      toast.error("Erro ao enviar mídia: " + (json.error?.message || "Erro desconhecido"));
      return null;
    } catch {
      toast.error("Erro ao enviar mídia");
      return null;
    }
  };

  const saveToStorage = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop() || "bin";
      const filePath = `${userId}/${Date.now()}.${fileExt}`;
      const { data: storageData, error } = await supabase.storage
        .from("chat-media")
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (error || !storageData) return null;
      const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(storageData.path);
      return urlData?.publicUrl || null;
    } catch {
      return null;
    }
  };

  const buildOptimistic = (overrides: Partial<ChatMessage>): ChatMessage => ({
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    phone: cleanPhone,
    nomewpp: contactName,
    user_message: null,
    bot_message: null,
    message_type: "text",
    message_direction: "outbound",
    media_type: null,
    media_url: null,
    media_mime_type: null,
    media_filename: null,
    meta_account_id: metaAccount.id,
    user_id: user?.id || null,
    created_at: new Date().toISOString(),
    status: "pending",
    ...overrides,
  });

  const extractMetaMessageId = (json: any): string | null =>
    json?.messages?.[0]?.id || null;

  const performSend = async (
    optimistic: ChatMessage,
    sendFn: () => Promise<{ ok: boolean; error?: string; metaMessageId?: string | null }>,
    persistFn: (metaMessageId: string | null) => Promise<void>,
  ) => {
    const tempId = optimistic.id;
    try {
      const result = await sendFn();
      if (!result.ok) {
        updateOptimistic?.(tempId, { status: "failed" });
        toast.error(`Erro: ${result.error || "falha ao enviar"}`);
        return;
      }
      const metaId = result.metaMessageId || null;
      // Marca como enviado + guarda meta_message_id para status posterior
      updateOptimistic?.(tempId, { status: "sent", meta_message_id: metaId, delivery_status: "sent" });
      // Persistência em background — não bloqueia UI
      persistFn(metaId).catch((e) => console.error("Erro ao persistir mensagem:", e));
    } catch (err: any) {
      updateOptimistic?.(tempId, { status: "failed" });
      toast.error("Erro ao enviar: " + (err.message || ""));
    }
  };

  const sendTextMessage = async () => {
    if (!user?.id) return;
    const hasText = message.trim().length > 0;
    const hasFile = !!attachedFile;
    if (!hasText && !hasFile) return;

    if (hasFile && attachedFile) {
      // Mídia: precisa aguardar upload à Meta (não dá pra ser 100% otimista sem media_id)
      const fileSnapshot = attachedFile;
      const textSnapshot = hasText ? message.trim() : "";
      const mediaType = getMediaType(fileSnapshot.type);
      const localPreviewUrl = URL.createObjectURL(fileSnapshot);

      // Otimista imediato com preview local
      const optimistic = buildOptimistic({
        bot_message: textSnapshot || `[${mediaType}] ${fileSnapshot.name}`,
        media_type: mediaType,
        media_url: localPreviewUrl,
        media_mime_type: fileSnapshot.type,
        media_filename: fileSnapshot.name,
        message_type: mediaType,
      });
      addOptimistic?.(optimistic);
      setMessage("");
      setAttachedFile(null);
      setSending(true);

      try {
        const mediaId = await uploadMediaToMeta(fileSnapshot);
        if (!mediaId) { updateOptimistic?.(optimistic.id, { status: "failed" }); return; }

        const { data: json, error } = await supabase.functions.invoke("send-whatsapp-message", {
          body: {
            to: cleanPhone, type: mediaType, media_id: mediaId, media_type: mediaType,
            caption: textSnapshot || undefined,
            filename: mediaType === "document" ? fileSnapshot.name : undefined,
          }
        });
        if (error || json?.error) {
          updateOptimistic?.(optimistic.id, { status: "failed" });
          toast.error(`Erro: ${json?.error || error?.message}`);
          return;
        }
        const metaId = extractMetaMessageId(json);
        updateOptimistic?.(optimistic.id, { status: "sent", meta_message_id: metaId, delivery_status: "sent" });
        // Persistência em background
        (async () => {
          const persistentUrl = await saveToStorage(fileSnapshot, user.id);
          if (persistentUrl) updateOptimistic?.(optimistic.id, { media_url: persistentUrl });
          await (supabase as any).from("chat_messages").insert({
            user_id: user.id, phone: cleanPhone, nomewpp: contactName,
            bot_message: textSnapshot || `[${mediaType}] ${fileSnapshot.name}`,
            whatsapp_instance_name: "meta_official", message_type: "text", message_direction: "outbound",
            media_type: mediaType, media_url: persistentUrl,
            media_mime_type: fileSnapshot.type, media_filename: fileSnapshot.name,
            meta_account_id: metaAccount.id, created_at: optimistic.created_at,
            meta_message_id: metaId, delivery_status: "sent",
          });
        })().catch((e) => console.error("Erro persist mídia:", e));
      } finally {
        setSending(false);
      }
      return;
    }

    // Texto puro: 100% otimista
    const textSnapshot = message.trim();
    const optimistic = buildOptimistic({ bot_message: textSnapshot });
    addOptimistic?.(optimistic);
    setMessage("");

    performSend(
      optimistic,
      async () => {
        const { data: json, error } = await supabase.functions.invoke("send-whatsapp-message", {
          body: { to: cleanPhone, type: "text", text: textSnapshot }
        });
        if (error || json?.error) return { ok: false, error: json?.error || error?.message };
        return { ok: true, metaMessageId: extractMetaMessageId(json) };
      },
      async (metaId) => {
        await (supabase as any).from("chat_messages").insert({
          user_id: user.id, phone: cleanPhone, nomewpp: contactName,
          bot_message: textSnapshot, whatsapp_instance_name: "meta_official",
          message_type: "text", message_direction: "outbound", meta_account_id: metaAccount.id,
          created_at: optimistic.created_at,
          meta_message_id: metaId, delivery_status: "sent",
        });
      }
    );
  };

  const sendRecordedAudio = async () => {
    if (!recordedBlob || !user?.id) return;
    const blobSnapshot = recordedBlob;
    const urlSnapshot = recordedUrl;
    const filename = `audio_${Date.now()}.ogg`;
    const file = new File([blobSnapshot], filename, { type: "audio/ogg" });

    const optimistic = buildOptimistic({
      bot_message: "[audio]",
      message_type: "audio",
      media_type: "audio",
      media_url: urlSnapshot,
      media_mime_type: "audio/ogg",
      media_filename: filename,
    });
    addOptimistic?.(optimistic);
    // Limpa gravação imediatamente (mantém o objectURL ativo para o preview otimista)
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingSeconds(0);
    setSending(true);

    try {
      const proxyForm = new FormData();
      proxyForm.append("file", file);
      proxyForm.append("phone_number_id", metaAccount.phone_number_id);
      proxyForm.append("access_token", metaAccount.access_token);
      proxyForm.append("api_version", metaAccount.api_version);

      const uploadRes = await supabase.functions.invoke("meta-media-upload", { body: proxyForm });
      const uploadJson = uploadRes.data;
      if (!uploadJson?.id) { updateOptimistic?.(optimistic.id, { status: "failed" }); toast.error("Erro ao enviar áudio"); return; }

      const res = await fetch(
        `https://graph.facebook.com/${metaAccount.api_version}/${metaAccount.phone_number_id}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${metaAccount.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp", to: cleanPhone,
            type: "audio", audio: { id: uploadJson.id, voice: true },
          }),
        }
      );
      const msgJson = await res.json();
      if (msgJson.error) { updateOptimistic?.(optimistic.id, { status: "failed" }); toast.error(`Erro: ${msgJson.error.message}`); return; }

      const metaId = extractMetaMessageId(msgJson);
      updateOptimistic?.(optimistic.id, { status: "sent", meta_message_id: metaId, delivery_status: "sent" });
      (async () => {
        const persistentUrl = await saveToStorage(file, user.id);
        if (persistentUrl) updateOptimistic?.(optimistic.id, { media_url: persistentUrl });
        await (supabase as any).from("chat_messages").insert({
          user_id: user.id, phone: cleanPhone, nomewpp: contactName,
          bot_message: "[audio]", whatsapp_instance_name: "meta_official",
          message_type: "audio", message_direction: "outbound", media_type: "audio", media_url: persistentUrl,
          media_mime_type: "audio/ogg", media_filename: filename,
          meta_account_id: metaAccount.id, created_at: optimistic.created_at,
          meta_message_id: metaId, delivery_status: "sent",
        });
      })().catch((e) => console.error("Erro persist áudio:", e));
    } catch (err: any) {
      updateOptimistic?.(optimistic.id, { status: "failed" });
      toast.error("Erro ao enviar áudio: " + (err.message || ""));
    } finally {
      setSending(false);
    }
  };

  const buildTemplateComponents = (
    template: MetaTemplate
  ): { components: any[]; missingMedia: boolean; missingVars: boolean } => {
    const components: any[] = [];
    let missingMedia = false;
    let missingVars = false;

    const headerType = (template.header_type || "").toUpperCase();
    if (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType)) {
      const url = (template.header_media_url || "").trim();
      if (!url) {
        missingMedia = true;
      } else {
        const key = headerType.toLowerCase();
        const mediaObj: any = { link: url };
        components.push({
          type: "header",
          parameters: [{ type: key, [key]: mediaObj }],
        });
      }
    }

    // Body variables
    const matches = (template.body || "").match(/\{\{\s*\d+\s*\}\}/g) || [];
    const varCount = new Set(matches.map((m) => m.replace(/\D/g, ""))).size;
    if (varCount > 0) {
      const examples: string[] = Array.isArray(template.variables_example)
        ? template.variables_example.map((v: any) => String(v ?? ""))
        : [];
      if (examples.length < varCount) {
        missingVars = true;
      } else {
        components.push({
          type: "body",
          parameters: examples.slice(0, varCount).map((t) => ({ type: "text", text: t })),
        });
      }
    }

    return { components, missingMedia, missingVars };
  };

  const sendTemplateMessage = async () => {
    if (!user?.id || !selectedTemplate) return;
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    const { components, missingMedia, missingVars } = buildTemplateComponents(template);
    if (missingMedia) {
      toast.error(
        `Template "${template.name}" precisa de mídia no cabeçalho. Peça ao admin global para cadastrar a URL da imagem em Configurações → WhatsApp → Templates.`
      );
      return;
    }
    if (missingVars) {
      toast.error(
        `Template "${template.name}" tem variáveis no corpo sem valores de exemplo cadastrados.`
      );
      return;
    }

    const optimistic = buildOptimistic({
      bot_message: template.body || `[Template] ${template.name}`,
    });
    addOptimistic?.(optimistic);
    setSelectedTemplate("");

    performSend(
      optimistic,
      async () => {
        const { data: json, error } = await supabase.functions.invoke("send-whatsapp-message", {
          body: {
            to: cleanPhone, type: "template",
            template_name: template.name,
            template_language: template.language || "pt_BR",
            template_components: components.length > 0 ? components : undefined,
          }
        });
        if (error || json?.error) return { ok: false, error: json?.error || error?.message };
        return { ok: true, metaMessageId: extractMetaMessageId(json) };
      },
      async (metaId) => {
        await (supabase as any).from("chat_messages").insert({
          user_id: user.id, phone: cleanPhone, nomewpp: contactName,
          bot_message: template.body || `[Template] ${template.name}`,
          whatsapp_instance_name: "meta_official", message_type: "text", message_direction: "outbound",
          meta_account_id: metaAccount.id, created_at: optimistic.created_at,
          meta_message_id: metaId, delivery_status: "sent",
        });
      }
    );
  };




  return (
    <div className="border-t border-border pt-3 space-y-2">
      {ecosystemBlocks >= 2 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/40 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            A Meta está bloqueando entregas para este contato por qualidade do ecossistema
            ({ecosystemBlocks} falhas nos últimos 30 dias). Evite reenviar templates — considere outro canal.
          </span>
        </div>
      )}
      {isWithin24h ? (
        <>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Clock className="h-3 w-3" />
            <span>
              Janela de 24h ativa — texto livre e mídia habilitados
              {windowExpiresAt && ` (expira ${windowExpiresAt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })})`}
            </span>
          </div>

          {attachedFile && !isRecording && !recordedBlob && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/20 border border-border">
              <MediaTypeIcon type={getMediaType(attachedFile.type)} className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs truncate flex-1">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {isRecording && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-500 font-medium">Gravando... {formatSeconds(recordingSeconds)}</span>
              <button onClick={stopRecording} className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
                <Square className="h-3.5 w-3.5 fill-current" /> Parar
              </button>
            </div>
          )}

          {recordedBlob && recordedUrl && !isRecording && (
            <div className="flex flex-col gap-2 px-3 py-2 rounded-md bg-muted/15 border border-border">
              <WhatsAppAudioPlayer src={recordedUrl} fillContainer />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-600" onClick={discardRecording}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Descartar
                </Button>
                <Button type="button" size="sm" className="h-7 px-3 text-xs" onClick={sendRecordedAudio} disabled={sending}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Enviar áudio
                </Button>
              </div>
            </div>
          )}

          {!isRecording && !recordedBlob && (
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef} type="file" accept={ALL_ACCEPTED} className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 16 * 1024 * 1024) { toast.error("Arquivo deve ter no máximo 16MB"); return; }
                    setAttachedFile(file);
                  }
                  e.target.value = "";
                }}
              />
              <div className="flex-1 flex items-end gap-1 rounded-3xl bg-muted px-2 py-1.5 min-h-[48px]">
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-background/60"
                      aria-label="Inserir emoji"
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    className="p-0 border-0 bg-transparent shadow-none w-auto"
                  >
                    <EmojiPicker
                      theme={emojiTheme}
                      emojiStyle={EmojiStyle.NATIVE}
                      lazyLoadEmojis
                      searchPlaceHolder="Buscar emoji"
                      width={320}
                      height={380}
                      onEmojiClick={(e) => { insertEmoji(e.emoji); }}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-background/60"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Anexar arquivo"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Textarea
                  ref={textareaRef}
                  value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder={attachedFile ? "Legenda (opcional)..." : "Digite uma mensagem"}
                  className="flex-1 min-h-[36px] max-h-[120px] text-sm resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1.5"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTextMessage(); } }}
                />
              </div>
              {!message.trim() && !attachedFile ? (
                <Button
                  type="button"
                  size="icon"
                  className="h-12 w-12 rounded-full flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={startRecording}
                  aria-label="Gravar áudio"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  onClick={sendTextMessage}
                  disabled={sending || (!message.trim() && !attachedFile)}
                  size="icon"
                  className="h-12 w-12 rounded-full flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                  aria-label="Enviar mensagem"
                >
                  <Send className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {!isRecording && !recordedBlob && templates.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="flex-1 h-8 text-xs min-w-0 [&>span]:truncate">
                    <SelectValue className="truncate" placeholder="Enviar template rápido..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={sendTemplateMessage}
                  disabled={sending || !selectedTemplate}
                  className="h-8 text-xs shrink-0"
                  aria-label="Enviar template"
                >
                  <Send className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Template</span>
                </Button>
              </div>
              {selectedTemplate && templates.find((t) => t.id === selectedTemplate)?.body && (
                <div className="text-xs text-muted-foreground bg-muted/10 rounded-md p-2 border border-border">
                  <span className="font-medium">Preview: </span>
                  {templates.find((t) => t.id === selectedTemplate)?.body}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Fora da janela de 24h — apenas templates aprovados</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="flex-1 h-9 text-xs min-w-0 [&>span]:truncate">
                <SelectValue className="truncate" placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <SelectItem value="none" disabled>Nenhum template aprovado</SelectItem>
                ) : (
                  templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                )}
              </SelectContent>
            </Select>
            <Button onClick={sendTemplateMessage} disabled={sending || !selectedTemplate} className="h-9 text-xs shrink-0" aria-label="Enviar template">
              <Send className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Enviar</span>
            </Button>
          </div>
          {selectedTemplate && templates.find((t) => t.id === selectedTemplate)?.body && (
            <div className="text-xs text-muted-foreground bg-muted/10 rounded-md p-2 border border-border">
              <span className="font-medium">Preview: </span>
              {templates.find((t) => t.id === selectedTemplate)?.body}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MetaChatInput;
