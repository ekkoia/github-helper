import React from "react";
import { FileText, Download } from "lucide-react";
import WhatsAppAudioPlayer from "./WhatsAppAudioPlayer";
import { ChatMessage } from "@/hooks/useChatMessages";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOutbound = !!message.bot_message;
  const text = message.user_message || message.bot_message || "";
  const time = format(new Date(message.created_at), "HH:mm", { locale: ptBR });

  const renderMedia = () => {
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
      return (
        <WhatsAppAudioPlayer
          src={message.media_url}
          isSent={isOutbound}
          fillContainer
        />
      );
    }

    if (message.media_type === "video") {
      return (
        <video
          src={message.media_url}
          controls
          className="rounded-lg max-w-[240px]"
        />
      );
    }

    if (message.media_type === "document") {
      return (
        <a
          href={message.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm underline"
        >
          <FileText className="h-4 w-4 flex-shrink-0" />
          <span className="truncate max-w-[180px]">
            {message.media_filename || "Documento"}
          </span>
          <Download className="h-3.5 w-3.5 flex-shrink-0" />
        </a>
      );
    }

    return null;
  };

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm"
        }`}
      >
        {renderMedia()}
        {text && text !== "[audio]" && text !== "[image]" && text !== "[video]" && text !== "[document]" && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
        )}
        <div className={`flex justify-end mt-0.5 ${isOutbound ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          <span className="text-[10px]">{time}</span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
