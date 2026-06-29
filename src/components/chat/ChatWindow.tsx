import React, { useEffect, useRef } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useMetaAccount } from "@/hooks/useMetaAccount";
import MessageBubble from "./MessageBubble";
import MetaChatInput from "./MetaChatInput";
import { AlertCircle, MessageCircle } from "lucide-react";

interface ChatWindowProps {
  phone: string;
  name: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ phone, name }) => {
  const { messages, loading, refetch } = useChatMessages(phone);
  const { account, loading: loadingAccount } = useMetaAccount();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll para o final quando chegam novas mensagens
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loadingAccount) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertCircle className="h-10 w-10 opacity-40" />
        <div className="text-center">
          <p className="font-medium text-sm">Conta Meta não configurada</p>
          <p className="text-xs mt-1">Configure em Configurações → WhatsApp Meta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header do contato */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
          {name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{phone}</p>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-muted/10">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
            <MessageCircle className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4">
        <MetaChatInput
          contactPhone={phone}
          contactName={name}
          metaAccount={account}
          onMessageSent={refetch}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
