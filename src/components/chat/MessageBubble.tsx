import React from "react";
import { FileText, Download, Clock, AlertCircle, Check, CheckCheck, RotateCw } from "lucide-react";

import WhatsAppAudioPlayer from "./WhatsAppAudioPlayer";
import { ChatMessage } from "@/hooks/useChatMessages";
import { detectMediaKind, MediaPreviewInline } from "./mediaPreview";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";


interface MessageBubbleProps {
  message: ChatMessage;
  usersMap?: Record<string, any>;
  isAdmin?: boolean;
  hasLaterInbound?: boolean;
}


const TIME = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  });

const MediaContent: React.FC<{ message: ChatMessage; isSent: boolean }> = ({ message, isSent }) => {
  if (!message.media_type || !message.media_url) return null;

  if (message.media_type === "image") {
    return (
      <img
        src={message.media_url}
        alt="imagem"
        className="rounded-lg max-w-[240px] max-h-[240px] object-cover cursor-pointer"
        onClick={() => window.open(message.media_url!, "_blank")}
      />
    );
  }
  if (message.media_type === "audio") {
    return <WhatsAppAudioPlayer src={message.media_url} isSent={isSent} fillContainer />;
  }
  if (message.media_type === "video") {
    return <video src={message.media_url} controls className="rounded-lg max-w-[240px]" />;
  }
  if (message.media_type === "document") {
    return (
      <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline">
        <FileText className="h-4 w-4 flex-shrink-0" />
        <span className="truncate max-w-[180px]">{message.media_filename || "Documento"}</span>
        <Download className="h-3.5 w-3.5 flex-shrink-0" />
      </a>
    );
  }
  return null;
};

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const Bubble: React.FC<{ text: string | null; isSent: boolean; time: string; message: ChatMessage; senderName?: string | null; hasLaterInbound?: boolean }> = ({
  text, isSent, time, message, senderName, hasLaterInbound,
}) => {
  const detectedKind = detectMediaKind(text, message.media_type);
  const isPlaceholderText = !!(text && detectMediaKind(text));
  const displayText = text && !isPlaceholderText ? text : null;
  const status = message.status;

  const renderStatus = () => {
    const dstatus = message.delivery_status;
    const isFailed = status === "failed" || dstatus === "failed";
    if (isFailed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => message.__retry?.()}
              className="flex items-center gap-0.5 text-red-300 hover:text-red-100"
            >
              <AlertCircle className="h-3 w-3" />
              <RotateCw className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[260px] text-xs">
            {message.failure_reason ? `Falha: ${message.failure_reason}` : "Falha ao enviar — clique para reenviar."}
          </TooltipContent>
        </Tooltip>
      );
    }
    if (status === "pending" && !dstatus) {
      return (
        <Tooltip>
          <TooltipTrigger asChild><span><Clock className="h-3 w-3" /></span></TooltipTrigger>
          <TooltipContent side="left" className="text-xs">Enviando…</TooltipContent>
        </Tooltip>
      );
    }
    if (dstatus === "read") {
      return (
        <Tooltip>
          <TooltipTrigger asChild><span><CheckCheck className="h-3.5 w-3.5 text-sky-300" /></span></TooltipTrigger>
          <TooltipContent side="left" className="text-xs">Lida pelo destinatário.</TooltipContent>
        </Tooltip>
      );
    }
    if (dstatus === "delivered") {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span><CheckCheck className={`h-3.5 w-3.5 ${hasLaterInbound ? "opacity-90" : ""}`} /></span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[280px] text-xs leading-snug">
            Entregue no WhatsApp. O check azul (lida) só aparece se o destinatário tiver
            {" "}"Confirmações de leitura" ativadas nas configurações de privacidade do WhatsApp dele.
            {hasLaterInbound && (
              <div className="mt-1 text-emerald-300">
                O lead respondeu depois desta mensagem — então foi lida.
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild><span><Check className="h-3 w-3" /></span></TooltipTrigger>
        <TooltipContent side="left" className="max-w-[260px] text-xs">
          Enviada ao WhatsApp, aguardando confirmação de entrega.
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-1 items-end gap-1.5`}>
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
        isSent
          ? "bg-emerald-700 text-white rounded-br-sm"
          : "bg-card border border-border text-foreground rounded-bl-sm"
      } ${status === "pending" ? "opacity-80" : ""} ${status === "failed" ? "ring-1 ring-red-500/60" : ""}`}>
        {isSent && <MediaContent message={message} isSent={isSent} />}
        {displayText && <p className="whitespace-pre-wrap break-words leading-relaxed">{displayText}</p>}
        {!isSent && <MediaContent message={message} isSent={isSent} />}
        {!displayText && !message.media_url && detectedKind && (
          <div className="opacity-80"><MediaPreviewInline kind={detectedKind} /></div>
        )}
        <div className={`flex justify-end items-center gap-1 mt-0.5 ${isSent ? "text-white/70" : "text-muted-foreground"}`}>
          <span className="text-[10px]">{time}</span>
          {isSent && <TooltipProvider delayDuration={150}>{renderStatus()}</TooltipProvider>}
        </div>
      </div>
      {/* Avatar do assessor — só para mensagens enviadas pelo CRM (meta_account_id preenchido) */}
      {isSent && message.meta_account_id && senderName && (
        <div
          className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
          title={senderName}
        >
          {getInitials(senderName)}
        </div>
      )}
    </div>
  );
};



const MessageBubble: React.FC<MessageBubbleProps> = ({ message, usersMap = {}, isAdmin = false }) => {
  const time = TIME(message.created_at);

  // Nome do remetente (só para mensagens via CRM por assessor real)
  const senderName = message.meta_account_id && message.user_id
    ? usersMap[message.user_id]?.nome_completo || null
    : null;

  // Se tem os dois (formato legado n8n): renderiza dois balões sempre
  if (message.user_message && message.bot_message) {
    return (
      <>
        <Bubble text={message.user_message} isSent={false} time={time} message={message} />
        <Bubble text={message.bot_message} isSent={true} time={time} message={message} senderName={senderName} />
      </>
    );
  }

  // Só bot_message → outbound
  if (message.bot_message && !message.user_message) {
    return <Bubble text={message.bot_message} isSent={true} time={time} message={message} senderName={senderName} />;
  }

  // Só user_message → inbound
  if (message.user_message && !message.bot_message) {
    return <Bubble text={message.user_message} isSent={false} time={time} message={message} />;
  }

  // Só mídia
  if (message.message_direction) {
    const isSent = message.message_direction.trim() === "outbound";
    const text = isSent ? message.bot_message : message.user_message;
    return <Bubble text={text} isSent={isSent} time={time} message={message} senderName={isSent ? senderName : undefined} />;
  }

  return <Bubble text={null} isSent={false} time={time} message={message} />;
};

export default MessageBubble;
