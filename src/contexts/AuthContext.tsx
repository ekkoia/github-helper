import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Criar perfil automaticamente para login OAuth
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('user_id')
              .eq('user_id', session.user.id)
              .single();
            
            if (!existingProfile) {
              await supabase.from('profiles').insert({
                user_id: session.user.id,
                nome_completo: session.user.user_metadata?.full_name || 
                               session.user.user_metadata?.name ||
                               session.user.email?.split('@')[0]
              });
            }
          }, 0);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Registrar atividade de login (usando setTimeout para evitar deadlock)
      if (!error && data.user) {
        setTimeout(async () => {
          await supabase.from("user_activities").insert({
            user_id: data.user.id,
            activity_type: 'user_login',
            description: 'Fez login no sistema',
            metadata: {}
          });
        }, 0);
      }
      
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: nome,
            nome_completo: nome
          }
        }
      });

      if (error) return { error };

      // Create profile after successful signup
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            nome_completo: nome
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      // Registrar atividade de logout antes de sair
      if (user) {
        await supabase.from("user_activities").insert({
          user_id: user.id,
          activity_type: 'user_logout',
          description: 'Fez logout do sistema',
          metadata: {}
        });
      }
      
      await supabase.auth.signOut();
      // Limpar estado local imediatamente
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      // Mesmo com erro, limpar estado local
      setSession(null);
      setUser(null);
    }
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, session, signIn, signUp, signOut, signInWithGoogle, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
