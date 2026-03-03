export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      auto_assign_config: {
        Row: {
          ativo: boolean
          created_at: string
          faixa: string
          id: string
          ordem: number
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          faixa: string
          id?: string
          ordem?: number
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          faixa?: string
          id?: string
          ordem?: number
          user_id?: string
        }
        Relationships: []
      }
      auto_assign_state: {
        Row: {
          faixa: string
          id: string
          last_assigned_order: number
          updated_at: string
        }
        Insert: {
          faixa: string
          id?: string
          last_assigned_order?: number
          updated_at?: string
        }
        Update: {
          faixa?: string
          id?: string
          last_assigned_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      campaing_callix: {
        Row: {
          assessores_id: string | null
          created_at: string
          id: number
          list_id: string | null
          name_assessores: string | null
          update_at: string | null
        }
        Insert: {
          assessores_id?: string | null
          created_at?: string
          id?: number
          list_id?: string | null
          name_assessores?: string | null
          update_at?: string | null
        }
        Update: {
          assessores_id?: string | null
          created_at?: string
          id?: number
          list_id?: string | null
          name_assessores?: string | null
          update_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          active: boolean | null
          bot_message: string | null
          conversation_id: string | null
          created_at: string | null
          etapa_atendimento: string | null
          id: number
          message_type: string | null
          nomewpp: string | null
          phone: string | null
          user_message: string | null
        }
        Insert: {
          active?: boolean | null
          bot_message?: string | null
          conversation_id?: string | null
          created_at?: string | null
          etapa_atendimento?: string | null
          id?: number
          message_type?: string | null
          nomewpp?: string | null
          phone?: string | null
          user_message?: string | null
        }
        Update: {
          active?: boolean | null
          bot_message?: string | null
          conversation_id?: string | null
          created_at?: string | null
          etapa_atendimento?: string | null
          id?: number
          message_type?: string | null
          nomewpp?: string | null
          phone?: string | null
          user_message?: string | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          day_counter: string | null
          etapa_atendimento: string | null
          id: number
          phone: string | null
          step_hour: string | null
          step_hour_1: string | null
          step_hour_2: string | null
          step_hour_3: string | null
          step_hour_4: string | null
          step_hour_5: string | null
          step_hour2: string | null
          step_hour3: string | null
          step_hour4: string | null
          step_hour5: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          day_counter?: string | null
          etapa_atendimento?: string | null
          id?: number
          phone?: string | null
          step_hour?: string | null
          step_hour_1?: string | null
          step_hour_2?: string | null
          step_hour_3?: string | null
          step_hour_4?: string | null
          step_hour_5?: string | null
          step_hour2?: string | null
          step_hour3?: string | null
          step_hour4?: string | null
          step_hour5?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          day_counter?: string | null
          etapa_atendimento?: string | null
          id?: number
          phone?: string | null
          step_hour?: string | null
          step_hour_1?: string | null
          step_hour_2?: string | null
          step_hour_3?: string | null
          step_hour_4?: string | null
          step_hour_5?: string | null
          step_hour2?: string | null
          step_hour3?: string | null
          step_hour4?: string | null
          step_hour5?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dados_cliente: {
        Row: {
          atendimento_ia: string | null
          created_at: string | null
          id: number
          nomewpp: string | null
          telefone: string | null
        }
        Insert: {
          atendimento_ia?: string | null
          created_at?: string | null
          id?: number
          nomewpp?: string | null
          telefone?: string | null
        }
        Update: {
          atendimento_ia?: string | null
          created_at?: string | null
          id?: number
          nomewpp?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      dedupe_events: {
        Row: {
          created_at: string
          dedupe_key: string | null
          id: number
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          id?: number
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          id?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      funil_etapas: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          ordem: number
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      lead_custom_fields: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          label: string
          nome: string
          obrigatorio: boolean | null
          opcoes: Json | null
          ordem: number | null
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          label: string
          nome: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          tipo?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          label?: string
          nome?: string
          obrigatorio?: boolean | null
          opcoes?: Json | null
          ordem?: number | null
          tipo?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          armazenamento: string | null
          cidade: string | null
          created_time_brasil: string | null
          data_atualizacao: string
          data_criacao: string
          distancia_km: number | null
          email: string | null
          estrada_terra_km: number | null
          etapa_funil: string | null
          id: string
          intencao: string | null
          investimento_real: number | null
          localizacao_embarque: string | null
          meta_lead_id: number | null
          nome_completo: string
          nota_assessor: string | null
          observacoes: string | null
          origem: string | null
          origens: Json | null
          percentual_royalties: number | null
          perfil: string | null
          protocolo_atendimento: string | null
          qualidade: string | null
          responsavel_id: string | null
          sentido: string | null
          telefone: string | null
          tem_royalties: boolean | null
          tipo_grao: string | null
          uf: string | null
          valor_produto: number | null
          volume: string | null
        }
        Insert: {
          armazenamento?: string | null
          cidade?: string | null
          created_time_brasil?: string | null
          data_atualizacao?: string
          data_criacao?: string
          distancia_km?: number | null
          email?: string | null
          estrada_terra_km?: number | null
          etapa_funil?: string | null
          id?: string
          intencao?: string | null
          investimento_real?: number | null
          localizacao_embarque?: string | null
          meta_lead_id?: number | null
          nome_completo: string
          nota_assessor?: string | null
          observacoes?: string | null
          origem?: string | null
          origens?: Json | null
          percentual_royalties?: number | null
          perfil?: string | null
          protocolo_atendimento?: string | null
          qualidade?: string | null
          responsavel_id?: string | null
          sentido?: string | null
          telefone?: string | null
          tem_royalties?: boolean | null
          tipo_grao?: string | null
          uf?: string | null
          valor_produto?: number | null
          volume?: string | null
        }
        Update: {
          armazenamento?: string | null
          cidade?: string | null
          created_time_brasil?: string | null
          data_atualizacao?: string
          data_criacao?: string
          distancia_km?: number | null
          email?: string | null
          estrada_terra_km?: number | null
          etapa_funil?: string | null
          id?: string
          intencao?: string | null
          investimento_real?: number | null
          localizacao_embarque?: string | null
          meta_lead_id?: number | null
          nome_completo?: string
          nota_assessor?: string | null
          observacoes?: string | null
          origem?: string | null
          origens?: Json | null
          percentual_royalties?: number | null
          perfil?: string | null
          protocolo_atendimento?: string | null
          qualidade?: string | null
          responsavel_id?: string | null
          sentido?: string | null
          telefone?: string | null
          tem_royalties?: boolean | null
          tipo_grao?: string | null
          uf?: string | null
          valor_produto?: number | null
          volume?: string | null
        }
        Relationships: []
      }
      leadsNativo_feeagro: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          adset_id: string | null
          adset_name: string | null
          assessor_atribuido: string | null
          created_at: string | null
          created_time: string | null
          email: string | null
          form_id: string | null
          form_locale: string | null
          form_name: string | null
          form_status: string | null
          id: number
          nome_completo: string | null
          telefone: string | null
          valor_investimento: string | null
          "Você concorda que esse formulário não trata-se de empréstim":
            | string
            | null
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          assessor_atribuido?: string | null
          created_at?: string | null
          created_time?: string | null
          email?: string | null
          form_id?: string | null
          form_locale?: string | null
          form_name?: string | null
          form_status?: string | null
          id?: number
          nome_completo?: string | null
          telefone?: string | null
          valor_investimento?: string | null
          "Você concorda que esse formulário não trata-se de empréstim"?:
            | string
            | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          assessor_atribuido?: string | null
          created_at?: string | null
          created_time?: string | null
          email?: string | null
          form_id?: string | null
          form_locale?: string | null
          form_name?: string | null
          form_status?: string | null
          id?: number
          nome_completo?: string | null
          telefone?: string | null
          valor_investimento?: string | null
          "Você concorda que esse formulário não trata-se de empréstim"?:
            | string
            | null
        }
        Relationships: []
      }
      leadsNativo_feeagro_2: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          adset_id: string | null
          adset_name: string | null
          created_at: string | null
          created_time: string | null
          email: string | null
          form_id: string | null
          form_locale: string | null
          form_name: string | null
          form_status: string | null
          id: number
          nome_completo: string | null
          telefone: string | null
          valor_investimento: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          created_at?: string | null
          created_time?: string | null
          email?: string | null
          form_id?: string | null
          form_locale?: string | null
          form_name?: string | null
          form_status?: string | null
          id?: number
          nome_completo?: string | null
          telefone?: string | null
          valor_investimento?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          adset_id?: string | null
          adset_name?: string | null
          created_at?: string | null
          created_time?: string | null
          email?: string | null
          form_id?: string | null
          form_locale?: string | null
          form_name?: string | null
          form_status?: string | null
          id?: number
          nome_completo?: string | null
          telefone?: string | null
          valor_investimento?: string | null
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          nome_completo: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          telefone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          nome_completo?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          telefone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          nome_completo?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          telefone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome_completo: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome_completo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome_completo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      round_robin_control: {
        Row: {
          assessores_ids: string
          contador: number | null
          data_atualizacao: string | null
          faixa: string
          id: number
          list_id: string | null
          ultimo_assessor_id: number | null
        }
        Insert: {
          assessores_ids?: string
          contador?: number | null
          data_atualizacao?: string | null
          faixa?: string
          id?: number
          list_id?: string | null
          ultimo_assessor_id?: number | null
        }
        Update: {
          assessores_ids?: string
          contador?: number | null
          data_atualizacao?: string | null
          faixa?: string
          id?: number
          list_id?: string | null
          ultimo_assessor_id?: number | null
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_callix_mapping: {
        Row: {
          cal_event_type_id: string | null
          callix_assessor_id: string
          callix_list_id: string
          callix_name: string | null
          created_at: string
          id: string
          update_at: string | null
          user_id: string
        }
        Insert: {
          cal_event_type_id?: string | null
          callix_assessor_id: string
          callix_list_id: string
          callix_name?: string | null
          created_at?: string
          id?: string
          update_at?: string | null
          user_id: string
        }
        Update: {
          cal_event_type_id?: string | null
          callix_assessor_id?: string
          callix_list_id?: string
          callix_name?: string | null
          created_at?: string
          id?: string
          update_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          app_notifications: boolean | null
          created_at: string
          default_view: string | null
          density: string | null
          digest_frequency: string | null
          email_notifications: boolean | null
          id: string
          inactive_lead_alerts: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_notifications?: boolean | null
          created_at?: string
          default_view?: string | null
          density?: string | null
          digest_frequency?: string | null
          email_notifications?: boolean | null
          id?: string
          inactive_lead_alerts?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_notifications?: boolean | null
          created_at?: string
          default_view?: string | null
          density?: string | null
          digest_frequency?: string | null
          email_notifications?: boolean | null
          id?: string
          inactive_lead_alerts?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_proximo_assessor: {
        Args: { faixa_investimento: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role: "user" | "admin" | "global"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "global"],
    },
  },
} as const
