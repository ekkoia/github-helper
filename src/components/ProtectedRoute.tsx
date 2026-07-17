import { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profileChecked, setProfileChecked] = useState(false);
  const checkedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      checkedUserIdRef.current = null;
      setProfileChecked(false);
      navigate('/auth');
      return;
    }

    // Só checa uma vez por user.id — evita re-executar em cada TOKEN_REFRESHED
    if (checkedUserIdRef.current === user.id) {
      if (!profileChecked) setProfileChecked(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, senha_definida')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      // Fail-open: em erro transitório, não expulsa o usuário — mantém a tela
      if (error) {
        checkedUserIdRef.current = user.id;
        setProfileChecked(true);
        return;
      }

      if (!data || (data as any).senha_definida === false) {
        navigate('/set-password', { replace: true });
        return;
      }

      checkedUserIdRef.current = user.id;
      setProfileChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate, profileChecked]);

  if (loading || !user || !profileChecked) {
    return null;
  }

  return <>{children}</>;
};
