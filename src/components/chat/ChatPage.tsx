import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useConversations } from "@/hooks/useConversations";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";
import { MessageCircle } from "lucide-react";

export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [selectedAssessor, setSelectedAssessor] = useState<string | null>(null);
  const { conversations, loading } = useConversations();

  useEffect(() => {
    const phone = searchParams.get("phone");
    const name = searchParams.get("name");
    if (phone) {
      setSelectedPhone(phone);
      setSelectedName(name || phone);
      setSelectedAssessor(null);
    }
  }, [searchParams]);

  const handleSelect = (phone: string, name: string, assessorName?: string | null) => {
    setSelectedPhone(phone);
    setSelectedName(name);
    setSelectedAssessor(assessorName || null);
  };

  const handleBack = () => setSelectedPhone(null);

  return (
    <div className="flex h-[calc(100vh-4rem)] rounded-lg border border-border overflow-hidden bg-background">
      {/* Coluna esquerda — lista de conversas */}
      <div
        className={`${
          selectedPhone ? "hidden md:flex" : "flex"
        } w-full md:w-80 md:flex-shrink-0 flex-col`}
      >
        <ConversationList
          conversations={conversations}
          loading={loading}
          selectedPhone={selectedPhone}
          onSelect={handleSelect}
        />
      </div>

      <div
        className={`${
          selectedPhone ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0`}
      >
        {selectedPhone ? (
          <ChatWindow
            phone={selectedPhone}
            name={selectedName}
            assessorName={selectedAssessor}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">WhatsApp Meta</p>
              <p className="text-sm mt-1">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
