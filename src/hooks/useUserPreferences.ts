import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  default_view: 'tabela' | 'kanban';
  density: 'compact' | 'comfortable' | 'spacious';
  email_notifications: boolean;
  app_notifications: boolean;
  digest_frequency: 'daily' | 'weekly' | 'never';
  inactive_lead_alerts: boolean;
}

export const useUserPreferences = () => {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching preferences:', error);
          setLoading(false);
          return;
        }

        if (data) {
          const prefs: UserPreferences = {
            theme: data.theme as 'light' | 'dark' | 'system',
            default_view: data.default_view as 'tabela' | 'kanban',
            density: data.density as 'compact' | 'comfortable' | 'spacious',
            email_notifications: data.email_notifications ?? true,
            app_notifications: data.app_notifications ?? true,
            digest_frequency: data.digest_frequency as 'daily' | 'weekly' | 'never',
            inactive_lead_alerts: data.inactive_lead_alerts ?? true,
          };
          setPreferences(prefs);
          
          // Aplicar tema
          setTheme(prefs.theme);
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user, setTheme]);

  return { preferences, loading };
};
