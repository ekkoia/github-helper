import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  user_id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
}

export const useUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, nome_completo, email, avatar_url')
        .order('nome_completo', { ascending: true });

      if (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  // Mapa user_id -> Profile para lookup rápido
  const usersMap = useMemo(() => {
    const map: Record<string, Profile> = {};
    users.forEach(user => {
      map[user.user_id] = user;
    });
    return map;
  }, [users]);

  return { users, loading, usersMap };
};
