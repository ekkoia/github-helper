import React from "react";
import { FileText, Download } from "lucide-react";
import WhatsAppAudioPlayer from "./WhatsAppAudioPlayer";
import { ChatMessage } from "@/hooks/useChatMessages";

interface MessageBubbleProps {
  message: ChatMessage;
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

const Bubble: React.FC<{ text: string | null; isSent: boolean; time: string; message: ChatMessage }> = ({
  text, isSent, time, message,
}) => {
  const placeholder = message.media_type ? `[${message.media_type}]` : null;
  const displayText = text && !["[audio]", "[image]", "[video]", "[document]"].includes(text) ? text : null;

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-1`}>
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
        isSent
          ? "bg-primary text-primary-foreground rounded-br-sm"
          : "bg-card border border-border text-foreground rounded-bl-sm"
      }`}>
        {isSent && <MediaContent message={message} isSent={isSent} />}
        {displayText && <p className="whitespace-pre-wrap break-words leading-relaxed">{displayText}</p>}
        {!displayText && !isSent && <MediaContent message={message} isSent={isSent} />}
        {!displayText && placeholder && (
          <p className="text-xs opacity-60">{placeholder}</p>
        )}
        <div className={`flex justify-end mt-0.5 ${isSent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          <span className="text-[10px]">{time}</span>
        </div>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const time = TIME(message.created_at);

  // Formato novo: message_direction define o lado
  if (message.message_direction) {
    const isSent = message.message_direction === "outbound";
    const text = isSent ? message.bot_message : message.user_message;
    return <Bubble text={text} isSent={isSent} time={time} message={message} />;
  }

  // Formato legado do n8n: uma linha com user_message + bot_message
  // Renderiza os dois balões: lead (esquerda) depois IA (direita)
  return (
    <>
      {message.user_message && (
        <Bubble text={message.user_message} isSent={false} time={time} message={message} />
      )}
      {message.bot_message && (
        <Bubble text={message.bot_message} isSent={true} time={time} message={message} />
      )}
    </>
  );
};

export default MessageBubble;
