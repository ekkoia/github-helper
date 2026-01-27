import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const HeaderGreeting = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState<string>("");

  // Atualizar hora a cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(timer);
  }, []);

  // Buscar nome do usuário
  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("nome_completo")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.nome_completo) {
        // Pegar apenas o primeiro nome
        const firstName = data.nome_completo.split(" ")[0];
        setUserName(firstName);
      }
    };

    fetchUserName();
  }, [user]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const formattedDate = format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const formattedTime = format(currentTime, "HH:mm");

  // Capitalizar primeira letra da data
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="flex flex-col">
      <h2 className="text-lg font-semibold text-foreground">
        {getGreeting()}, {userName || "Usuário"}!
      </h2>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{capitalizedDate}</span>
        <span>•</span>
        <span>{formattedTime}</span>
      </div>
    </div>
  );
};
