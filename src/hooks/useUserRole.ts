import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'user' | 'sdr' | 'admin' | 'global' | null;

// Ordered from highest to lowest privilege
const PRIVILEGE_ORDER: Exclude<UserRole, null>[] = ['global', 'admin', 'sdr', 'user'];

const pickHighestRole = (roles: string[]): UserRole => {
  for (const r of PRIVILEGE_ORDER) {
    if (roles.includes(r)) return r;
  }
  return 'user';
};

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('user');
        } else {
          const roles = (data || []).map((r: any) => r.role as string);
          setRole(roles.length ? pickHighestRole(roles) : 'user');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  const isGlobal = role === 'global';
  const isAdmin = role === 'admin' || role === 'global';
  const isSDR = role === 'sdr';
  // Capabilities
  const canAssignLeads = isAdmin || isSDR;
  const canUseInactivityFilter = isAdmin || isSDR;

  return { role, loading, isAdmin, isGlobal, isSDR, canAssignLeads, canUseInactivityFilter };
};
