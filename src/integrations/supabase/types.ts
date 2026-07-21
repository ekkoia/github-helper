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
      agenda_blocks: {
        Row: {
          all_day: boolean | null
          block_date: string
          created_at: string | null
          end_time: string | null
          id: string
          reason: string | null
          start_time: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          block_date: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          reason?: string | null
          start_time?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          block_date?: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          reason?: string | null
          start_time?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agenda_events: {
        Row: {
          all_day: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_at: string | null
          event_type: string
          id: string
          lead_id: string | null
          metadata: Json | null
          reminder_minutes: number | null
          reminder_sent: boolean | null
          start_at: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          reminder_minutes?: number | null
          reminder_sent?: boolean | null
          start_at: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          reminder_minutes?: number | null
          reminder_sent?: boolean | null
          start_at?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
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
          delivery_status: string | null
          delivery_status_updated_at: string | null
          etapa_atendimento: string | null
          failure_reason: string | null
          id: number
          media_filename: string | null
          media_mime_type: string | null
          media_type: string | null
          media_url: string | null
          message_direction: string | null
          message_type: string | null
          meta_account_id: string | null
          meta_message_id: string | null
          nomewpp: string | null
          phone: string | null
          user_id: string | null
          user_message: string | null
          whatsapp_instance_name: string | null
        }
        Insert: {
          active?: boolean | null
          bot_message?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivery_status?: string | null
          delivery_status_updated_at?: string | null
          etapa_atendimento?: string | null
          failure_reason?: string | null
          id?: number
          media_filename?: string | null
          media_mime_type?: string | null
          media_type?: string | null
          media_url?: string | null
          message_direction?: string | null
          message_type?: string | null
          meta_account_id?: string | null
          meta_message_id?: string | null
          nomewpp?: string | null
          phone?: string | null
          user_id?: string | null
          user_message?: string | null
          whatsapp_instance_name?: string | null
        }
        Update: {
          active?: boolean | null
          bot_message?: string | null
          conversation_id?: string | null
          created_at?: string | null
          delivery_status?: string | null
          delivery_status_updated_at?: string | null
          etapa_atendimento?: string | null
          failure_reason?: string | null
          id?: number
          media_filename?: string | null
          media_mime_type?: string | null
          media_type?: string | null
          media_url?: string | null
          message_direction?: string | null
          message_type?: string | null
          meta_account_id?: string | null
          meta_message_id?: string | null
          nomewpp?: string | null
          phone?: string | null
          user_id?: string | null
          user_message?: string | null
          whatsapp_instance_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_meta_account_id_fkey"
            columns: ["meta_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_meta_accounts"
            referencedColumns: ["id"]
          },
        ]
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
          alerta_sem_contato_enviado: boolean | null
          armazenamento: string | null
          cidade: string | null
          created_time_brasil: string | null
          data_atualizacao: string
          data_criacao: string
          data_primeiro_contato: string | null
          distancia_km: number | null
          email: string | null
          estrada_terra_km: number | null
          etapa_funil: string | null
          faixa_investimento: string | null
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
          telefone_key: string | null
          tem_royalties: boolean | null
          template_fds_enviado_em: string | null
          tipo_grao: string | null
          uf: string | null
          valor_produto: number | null
          volume: string | null
        }
        Insert: {
          alerta_sem_contato_enviado?: boolean | null
          armazenamento?: string | null
          cidade?: string | null
          created_time_brasil?: string | null
          data_atualizacao?: string
          data_criacao?: string
          data_primeiro_contato?: string | null
          distancia_km?: number | null
          email?: string | null
          estrada_terra_km?: number | null
          etapa_funil?: string | null
          faixa_investimento?: string | null
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
          telefone_key?: string | null
          tem_royalties?: boolean | null
          template_fds_enviado_em?: string | null
          tipo_grao?: string | null
          uf?: string | null
          valor_produto?: number | null
          volume?: string | null
        }
        Update: {
          alerta_sem_contato_enviado?: boolean | null
          armazenamento?: string | null
          cidade?: string | null
          created_time_brasil?: string | null
          data_atualizacao?: string
          data_criacao?: string
          data_primeiro_contato?: string | null
          distancia_km?: number | null
          email?: string | null
          estrada_terra_km?: number | null
          etapa_funil?: string | null
          faixa_investimento?: string | null
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
          telefone_key?: string | null
          tem_royalties?: boolean | null
          template_fds_enviado_em?: string | null
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
          senha_definida: boolean
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
          senha_definida?: boolean
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
          senha_definida?: boolean
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rodizio_config: {
        Row: {
          ativo: boolean
          created_at: string | null
          id: string
          ordem: number
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          ordem?: number
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          ordem?: number
          user_id?: string
        }
        Relationships: []
      }
      rodizio_state: {
        Row: {
          contador: number | null
          id: number
          ultimo_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          contador?: number | null
          id?: number
          ultimo_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          contador?: number | null
          id?: number
          ultimo_user_id?: string | null
          updated_at?: string | null
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
      whatsapp_conversation_windows: {
        Row: {
          expires_at: string | null
          last_inbound_at: string | null
          meta_account_id: string | null
          phone_e164: string
          source: string
          updated_at: string
          wa_id: string | null
        }
        Insert: {
          expires_at?: string | null
          last_inbound_at?: string | null
          meta_account_id?: string | null
          phone_e164: string
          source?: string
          updated_at?: string
          wa_id?: string | null
        }
        Update: {
          expires_at?: string | null
          last_inbound_at?: string | null
          meta_account_id?: string | null
          phone_e164?: string
          source?: string
          updated_at?: string
          wa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_windows_meta_account_id_fkey"
            columns: ["meta_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_meta_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_meta_accounts: {
        Row: {
          access_token: string
          account_name: string | null
          api_version: string
          connection_type: string
          created_at: string | null
          id: string
          phone_number_id: string
          updated_at: string | null
          user_id: string
          waba_id: string
        }
        Insert: {
          access_token: string
          account_name?: string | null
          api_version?: string
          connection_type?: string
          created_at?: string | null
          id?: string
          phone_number_id: string
          updated_at?: string | null
          user_id: string
          waba_id: string
        }
        Update: {
          access_token?: string
          account_name?: string | null
          api_version?: string
          connection_type?: string
          created_at?: string | null
          id?: string
          phone_number_id?: string
          updated_at?: string | null
          user_id?: string
          waba_id?: string
        }
        Relationships: []
      }
      whatsapp_meta_templates: {
        Row: {
          account_id: string
          body: string | null
          buttons: Json | null
          category: string | null
          created_at: string | null
          footer: string | null
          header_content: string | null
          header_type: string | null
          id: string
          language: string
          name: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          variables_example: Json | null
        }
        Insert: {
          account_id: string
          body?: string | null
          buttons?: Json | null
          category?: string | null
          created_at?: string | null
          footer?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string
          name: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          variables_example?: Json | null
        }
        Update: {
          account_id?: string
          body?: string | null
          buttons?: Json | null
          category?: string | null
          created_at?: string | null
          footer?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string
          name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          variables_example?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_meta_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_meta_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_events: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          payload: Json
          phone_number_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          payload: Json
          phone_number_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          phone_number_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_webhook_health: { Args: never; Returns: undefined }
      get_lead_interactions: {
        Args: { _lead_id: string }
        Returns: {
          content: string
          occurred_at: string
          ord: number
          role: string
          source: string
        }[]
      }
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
      normalize_telefone_br: { Args: { _phone: string }; Returns: string }
      phone_key: { Args: { _phone: string }; Returns: string }
      reprocess_webhook_events: { Args: { _since?: string }; Returns: Json }
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
