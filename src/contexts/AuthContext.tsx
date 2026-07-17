import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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
  const signOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const currentAccessTokenRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const applySession = (nextSession: Session | null) => {
      const nextToken = nextSession?.access_token ?? null;
      const nextUserId = nextSession?.user?.id ?? null;
      // Se nada mudou de fato, evita re-render em cascata (TOKEN_REFRESHED, focus, etc.)
      if (
        nextToken === currentAccessTokenRef.current &&
        nextUserId === currentUserIdRef.current
      ) {
        return;
      }
      currentAccessTokenRef.current = nextToken;
      currentUserIdRef.current = nextUserId;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (signOutTimerRef.current) {
          clearTimeout(signOutTimerRef.current);
          signOutTimerRef.current = null;
        }
        applySession(session);
      } else if (event === "SIGNED_OUT") {
        signOutTimerRef.current = setTimeout(() => {
          currentAccessTokenRef.current = null;
          currentUserIdRef.current = null;
          setSession(null);
          setUser(null);
          signOutTimerRef.current = null;
        }, 300);
      }

      // Criar perfil automaticamente para login OAuth
      if (event === "SIGNED_IN" && session?.user) {
        setTimeout(async () => {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!existingProfile) {
            await supabase.from("profiles").insert({
              user_id: session.user.id,
              nome_completo:
                session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.email?.split("@")[0],
            });
          }
        }, 0);
      }

      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (signOutTimerRef.current) {
        clearTimeout(signOutTimerRef.current);
      }
    };
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
            activity_type: "user_login",
            description: "Fez login no sistema",
            metadata: {},
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
            nome_completo: nome,
          },
        },
      });

      if (error) return { error };

      // Create profile after successful signup
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: data.user.id,
          nome_completo: nome,
        });

        if (profileError) {
          console.error("Error creating profile:", profileError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Cancel any pending debounced sign-out
    if (signOutTimerRef.current) {
      clearTimeout(signOutTimerRef.current);
      signOutTimerRef.current = null;
    }
    try {
      if (user) {
        await supabase.from("user_activities").insert({
          user_id: user.id,
          activity_type: "user_logout",
          description: "Fez logout do sistema",
          metadata: {},
        });
      }

      await supabase.auth.signOut();
      // Limpar estado local imediatamente
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      // Mesmo com erro, limpar estado local
      setSession(null);
      setUser(null);
    }
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch(`https://omilhfohvstqsonhyuxp.supabase.co/functions/v1/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: new Error(data.error || "Erro ao enviar email de recuperação") };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, signInWithGoogle, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
