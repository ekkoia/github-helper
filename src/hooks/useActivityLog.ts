import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ActivityType = 
  | 'lead_created'
  | 'lead_updated'
  | 'lead_deleted'
  | 'lead_stage_changed'
  | 'lead_viewed'
  | 'lead_exported'
  | 'lead_notes_added'
  | 'lead_won'
  | 'lead_lost'
  | 'lead_contacted'
  | 'user_login'
  | 'user_logout'
  | 'user_created'
  | 'user_deleted'
  | 'user_role_changed'
  | 'config_updated'
  | 'funnel_updated';

export const useActivityLog = () => {
  const { user } = useAuth();

  const logActivity = async (
    activityType: ActivityType,
    description: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_activities")
        .insert({
          user_id: user.id,
          activity_type: activityType,
          description,
          metadata: metadata || {},
        });

      if (error) {
        console.error("Erro ao registrar atividade:", error);
      }
    } catch (error) {
      console.error("Erro ao registrar atividade:", error);
    }
  };

  return { logActivity };
};

export const getActivityTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    lead_created: 'Lead criado',
    lead_updated: 'Lead atualizado',
    lead_deleted: 'Lead excluído',
    lead_stage_changed: 'Etapa alterada',
    lead_viewed: 'Lead visualizado',
    lead_exported: 'Leads exportados',
    lead_notes_added: 'Observação adicionada',
    lead_won: 'Lead ganho',
    lead_lost: 'Lead perdido',
    lead_contacted: 'Lead contatado',
    user_login: 'Login',
    user_logout: 'Logout',
    user_created: 'Usuário criado',
    user_deleted: 'Usuário excluído',
    user_role_changed: 'Permissão alterada',
    config_updated: 'Configuração atualizada',
    funnel_updated: 'Funil atualizado',
  };
  return labels[type] || type;
};

export const getActivityTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    lead_created: '➕',
    lead_updated: '✏️',
    lead_deleted: '🗑️',
    lead_stage_changed: '🔄',
    lead_viewed: '👁️',
    lead_exported: '📥',
    lead_notes_added: '📝',
    lead_won: '🏆',
    lead_lost: '❌',
    lead_contacted: '📞',
    user_login: '🔓',
    user_logout: '🔒',
    user_created: '👤',
    user_deleted: '🗑️',
    user_role_changed: '🛡️',
    config_updated: '⚙️',
    funnel_updated: '📊',
  };
  return icons[type] || '📝';
};
