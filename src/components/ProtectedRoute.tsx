import { ReactNode, useEffect, useState } from 'react';
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

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    // Guard: convidado que ainda não definiu senha não tem profile criado.
    // Nesse caso, forçar /set-password.
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!error && !data) {
        navigate('/set-password', { replace: true });
        return;
      }
      setProfileChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  if (loading || !user || !profileChecked) {
    return null;
  }

  return <>{children}</>;
};
