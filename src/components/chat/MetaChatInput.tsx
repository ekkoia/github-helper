import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Send, Clock, AlertCircle, Paperclip, X, FileText,
  Image, Video, Music, Mic, Square, Trash2, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppAudioPlayer from "./WhatsAppAudioPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { MetaAccount } from "@/hooks/useMetaAccount";
import { toast } from "sonner";

interface MetaChatInputProps {
  contactPhone: string;
  contactName: string;
  metaAccount: MetaAccount;
  onMessageSent: () => void;
}

interface MetaTemplate {
  id: string;
  name: string;
  body: string;
  language: string;
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

const ENCODER_WORKER_URL = "https://omilhfohvstqsonhyuxp.supabase.co/storage/v1/object/public/chat-media/encoderWorker.min.js";

const MetaChatInput: React.FC<MetaChatInputProps> = ({
  contactPhone, contactName, metaAccount, onMessageSent,
}) => {
  // Normaliza número BR: garante DDI 55 + 9º dígito em celulares
  const cleanPhone = (() => {
    const raw = contactPhone.replace(/\D/g, "");
    // Garante DDI 55 mas não altera o número — a Meta resolve o formato
    return raw.startsWith("55") ? raw : `55${raw}`;
  })();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [isWithin24h, setIsWithin24h] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (recordedUrl) URL.revokeObjectURL(recordedUrl); };
  }, [recordedUrl]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Buscar templates aprovados
        const { data: tpls } = await (supabase as any)
          .from("whatsapp_meta_templates")
          .select("id, name, body, language")
          .eq("account_id", metaAccount.id)
          .eq("status", "approved");
        setTemplates(tpls || []);

        // Verificar janela de 24h

        const { data: lastMsg } = await (supabase as any)
          .from("chat_messages")
          .select("created_at")
          .eq("whatsapp_instance_name", "meta_official")
          .not("user_message", "is", null)
          .like("phone", `%${cleanPhone.slice(-8)}`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (lastMsg && lastMsg.length > 0) {
          const lastTime = new Date(lastMsg[0].created_at).getTime();
          setIsWithin24h(Date.now() - lastTime < 24 * 60 * 60 * 1000);
        }
      } catch (err) {
        console.error("Erro ao inicializar MetaChatInput:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [contactPhone, metaAccount.id]);

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

  const sendTextMessage = async () => {
    if (!user?.id) return;
    const hasText = message.trim().length > 0;
    const hasFile = !!attachedFile;
    if (!hasText && !hasFile) return;
    setSending(true);
    try {


      if (hasFile && attachedFile) {
        const mediaId = await uploadMediaToMeta(attachedFile);
        if (!mediaId) { setSending(false); return; }

        const mediaType = getMediaType(attachedFile.type);
        const mediaPayload: any = { id: mediaId };
        if (hasText) mediaPayload.caption = message.trim();
        if (mediaType === "document") mediaPayload.filename = attachedFile.name;

        const res = await fetch(
          `https://graph.facebook.com/${metaAccount.api_version}/${metaAccount.phone_number_id}/messages`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${metaAccount.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp", to: cleanPhone,
              type: mediaType, [mediaType]: mediaPayload,
            }),
          }
        );
        const json = await res.json();
        if (json.error) { toast.error(`Erro: ${json.error.message}`); setSending(false); return; }

        const persistentUrl = await saveToStorage(attachedFile, user.id);

        await (supabase as any).from("chat_messages").insert({
          user_id: user.id, phone: cleanPhone, nomewpp: contactName,
          bot_message: hasText ? message.trim() : `[${mediaType}] ${attachedFile.name}`,
          whatsapp_instance_name: "meta_official", message_type: "text", message_direction: "outbound",
          media_type: mediaType, media_url: persistentUrl,
          media_mime_type: attachedFile.type, media_filename: attachedFile.name,
          meta_account_id: metaAccount.id, created_at: new Date().toISOString(),
        });

        toast.success("Mídia enviada!");
        setMessage(""); setAttachedFile(null);
      } else {
        const res = await fetch(
          `https://graph.facebook.com/${metaAccount.api_version}/${metaAccount.phone_number_id}/messages`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${metaAccount.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp", to: cleanPhone,
              type: "text", text: { body: message.trim() },
            }),
          }
        );
        const json = await res.json();
        if (json.error) { toast.error(`Erro: ${json.error.message}`); setSending(false); return; }

        await (supabase as any).from("chat_messages").insert({
          user_id: user.id, phone: cleanPhone, nomewpp: contactName,
          bot_message: message.trim(), whatsapp_instance_name: "meta_official",
          message_type: "text", message_direction: "outbound", meta_account_id: metaAccount.id,
          created_at: new Date().toISOString(),
        });

        toast.success("Mensagem enviada!");
        setMessage("");
      }
      onMessageSent();
    } catch (err: any) {
      toast.error("Erro ao enviar: " + (err.message || ""));
    } finally {
      setSending(false);
    }
  };

  const sendRecordedAudio = async () => {
    if (!recordedBlob || !user?.id) return;
    setSending(true);
    try {
      const filename = `audio_${Date.now()}.ogg`;
      const file = new File([recordedBlob], filename, { type: "audio/ogg" });


      // Upload via edge function (proxy CORS)
      const proxyForm = new FormData();
      proxyForm.append("file", file);
      proxyForm.append("phone_number_id", metaAccount.phone_number_id);
      proxyForm.append("access_token", metaAccount.access_token);
      proxyForm.append("api_version", metaAccount.api_version);

      const uploadRes = await supabase.functions.invoke("meta-media-upload", { body: proxyForm });
      const uploadJson = uploadRes.data;
      if (!uploadJson?.id) { toast.error("Erro ao enviar áudio"); setSending(false); return; }

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
      if (msgJson.error) { toast.error(`Erro: ${msgJson.error.message}`); setSending(false); return; }

      const persistentUrl = await saveToStorage(file, user.id);

      await (supabase as any).from("chat_messages").insert({
        user_id: user.id, phone: cleanPhone, nomewpp: contactName,
        bot_message: "[audio]", whatsapp_instance_name: "meta_official",
        message_type: "audio", message_direction: "outbound", media_type: "audio", media_url: persistentUrl,
        media_mime_type: "audio/ogg", media_filename: filename,
        meta_account_id: metaAccount.id, created_at: new Date().toISOString(),
      });

      toast.success("Áudio enviado!");
      discardRecording();
      onMessageSent();
    } catch (err: any) {
      toast.error("Erro ao enviar áudio: " + (err.message || ""));
    } finally {
      setSending(false);
    }
  };

  const sendTemplateMessage = async () => {
    if (!user?.id || !selectedTemplate) return;
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;
    setSending(true);
    try {

      const res = await fetch(
        `https://graph.facebook.com/${metaAccount.api_version}/${metaAccount.phone_number_id}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${metaAccount.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp", to: cleanPhone,
            type: "template", template: { name: template.name, language: { code: template.language || "pt_BR" } },
          }),
        }
      );
      const json = await res.json();
      if (json.error) { toast.error(`Erro: ${json.error.message}`); return; }

      await (supabase as any).from("chat_messages").insert({
        user_id: user.id, phone: cleanPhone, nomewpp: contactName,
        bot_message: template.body || `[Template] ${template.name}`,
        whatsapp_instance_name: "meta_official", message_type: "text", message_direction: "outbound",
        meta_account_id: metaAccount.id, created_at: new Date().toISOString(),
      });

      toast.success("Template enviado!");
      setSelectedTemplate("");
      onMessageSent();
    } catch (err: any) {
      toast.error("Erro ao enviar template: " + (err.message || ""));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="border-t border-border pt-3 mt-3 flex items-center justify-center py-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-3 space-y-2">
      {isWithin24h ? (
        <>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Clock className="h-3 w-3" />
            <span>Janela de 24h ativa — texto livre e mídia habilitados</span>
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
            <div className="flex gap-2">
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
              <Button type="button" variant="ghost" size="icon" className="h-[60px] w-10 flex-shrink-0 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder={attachedFile ? "Legenda (opcional)..." : "Digite sua mensagem..."}
                className="min-h-[60px] max-h-[100px] text-sm resize-none"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTextMessage(); } }}
              />
              {!message.trim() && !attachedFile ? (
                <Button type="button" variant="ghost" size="icon" className="h-[60px] w-[60px] flex-shrink-0 text-muted-foreground" onClick={startRecording}>
                  <Mic className="h-5 w-5" />
                </Button>
              ) : (
                <Button onClick={sendTextMessage} disabled={sending || (!message.trim() && !attachedFile)} size="icon" className="h-[60px] w-[60px]">
                  <Send className="h-4 w-4" />
                </Button>
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
          <div className="flex gap-2">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <SelectItem value="none" disabled>Nenhum template aprovado</SelectItem>
                ) : (
                  templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                )}
              </SelectContent>
            </Select>
            <Button onClick={sendTemplateMessage} disabled={sending || !selectedTemplate}>
              <Send className="h-4 w-4 mr-1" /> Enviar
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
