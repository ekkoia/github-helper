import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, Calendar, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getActivityTypeLabel, getActivityTypeIcon } from "@/hooks/useActivityLog";

// Mapeamento de chaves de metadados para português
const METADATA_LABELS: Record<string, string> = {
  // Usuários
  role: "Permissão",
  new_user_email: "Email do usuário",
  target_user_id: "ID do usuário",
  user_name: "Nome",
  user_email: "Email",
  old_role: "Permissão anterior",
  new_role: "Nova permissão",
  
  // Leads
  lead_id: "ID do lead",
  lead_nome: "Nome do lead",
  lead_name: "Nome do lead",
  perfil: "Perfil",
  etapa_anterior: "Etapa anterior",
  etapa_nova: "Nova etapa",
  quantidade: "Quantidade",
  filtros: "Filtros aplicados",
  
  // Geral
  ip_address: "Endereço IP",
  user_agent: "Navegador",
  timestamp: "Data/hora",
  event_title: "Título do evento",
  event_id: "ID do evento",
  start_at: "Data/hora início",
};

// Mapeamento de valores para português
const VALUE_LABELS: Record<string, string> = {
  user: "Usuário",
  admin: "Administrador",
  global: "Global",
  true: "Sim",
  false: "Não",
};

const translateMetadataKey = (key: string): string => {
  return METADATA_LABELS[key] || key.replace(/_/g, " ");
};

const translateMetadataValue = (value: any): string => {
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  const stringValue = String(value);
  return VALUE_LABELS[stringValue.toLowerCase()] || stringValue;
};

interface ActivityWithUser {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  user_name: string;
  user_email: string;
}

interface AtividadesListaProps {
  activities: ActivityWithUser[];
  isLoading: boolean;
}

export const AtividadesLista = ({ activities, isLoading }: AtividadesListaProps) => {
  const getInitials = (name: string) => {
    if (!name) return "?";
    // Remover espaços extras e filtrar elementos vazios
    const names = name.trim().split(" ").filter(n => n.length > 0);
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names.length === 1 && names[0].length >= 2) {
      return names[0].slice(0, 2).toUpperCase();
    }
    return "?";
  };

  const getActivityTypeBadgeVariant = (type: string) => {
    if (type.includes('deleted')) return 'destructive';
    if (type.includes('created')) return 'default';
    if (type.includes('updated') || type.includes('changed')) return 'secondary';
    if (type.includes('login') || type.includes('logout')) return 'outline';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Atividades Recentes
          <Badge variant="secondary" className="ml-auto">
            {activities.length} {activities.length === 1 ? 'atividade' : 'atividades'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma atividade encontrada</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(activity.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {activity.user_name}
                      </span>
                      <Badge variant={getActivityTypeBadgeVariant(activity.activity_type)}>
                        {getActivityTypeIcon(activity.activity_type)} {getActivityTypeLabel(activity.activity_type)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {activity.description}
                    </p>
                    
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        {Object.entries(activity.metadata).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            <span className="font-medium">{translateMetadataKey(key)}:</span> {translateMetadataValue(value)}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(activity.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(activity.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                      <span className="text-muted-foreground/70">
                        {formatDistanceToNow(new Date(activity.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
