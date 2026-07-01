import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import logoImaculada from "@/assets/logo-arvora.png";

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
  confirmPassword: z.string().min(6, { message: "Confirme sua senha" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event, session?.user?.email);
        
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          if (session?.user) {
            setUserEmail(session.user.email || null);
            setVerifying(false);
          }
        }
        
        if (event === "PASSWORD_RECOVERY") {
          if (session?.user) {
            setUserEmail(session.user.email || null);
            setVerifying(false);
          }
        }
      }
    );

    // Verificar se há um token na URL (via hash ou search params)
    const handleTokenVerification = async () => {
      try {
        // Supabase pode enviar tokens via hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token");
        const type = hashParams.get("type") || searchParams.get("type");
        const error_description = hashParams.get("error_description") || searchParams.get("error_description");

        console.log("Token verification - type:", type, "has access_token:", !!accessToken);

        if (error_description) {
          toast.error(error_description);
          setTimeout(() => navigate("/auth"), 3000);
          return;
        }

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Erro ao verificar sessão:", error);
            toast.error("Link inválido ou expirado. Por favor, solicite um novo convite.");
            setTimeout(() => navigate("/auth"), 3000);
            return;
          }

          if (data.user) {
            setUserEmail(data.user.email || null);
          }
          setVerifying(false);
          return;
        }

        // Verificar se já existe uma sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserEmail(session.user.email || null);
          setVerifying(false);
        } else {
          // Sem sessão e sem token - redirecionar para login
          toast.error("Sessão não encontrada. Por favor, clique no link do email de convite.");
          setTimeout(() => navigate("/auth"), 3000);
        }
      } catch (error) {
        console.error("Erro na verificação:", error);
        setVerifying(false);
      }
    };

    // Delay para permitir que o Supabase processe o hash
    setTimeout(handleTokenVerification, 100);

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      passwordSchema.parse({ password, confirmPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const { data: updateData, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error("Erro ao definir senha: " + error.message);
      } else {
        const uid = updateData.user?.id;
        if (uid) {
          await (supabase as any)
            .from("profiles")
            .update({ senha_definida: true })
            .eq("user_id", uid);
        }
        setSuccess(true);
        toast.success("Senha definida com sucesso!");
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (error) {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevation-3 p-8 border border-border/50 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-primary rounded-full p-6 shadow-elevation-2">
                <img 
                  src={logoImaculada} 
                  alt="Imaculada Agronegócios" 
                  className="h-16 w-auto object-contain"
                />
              </div>
            </div>
            <p className="text-muted-foreground">Verificando convite...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-elevation-3 p-8 border border-border/50 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-primary rounded-full p-6 shadow-elevation-2">
                <CheckCircle className="h-16 w-16 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Senha definida!</h2>
            <p className="text-muted-foreground mb-4">Redirecionando para o sistema...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-elevation-3 p-8 border border-border/50">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="bg-primary rounded-full p-6 shadow-elevation-2">
              <img 
                src={logoImaculada} 
                alt="Imaculada Agronegócios" 
                className="h-16 w-auto object-contain"
              />
            </div>
          </div>

          {/* Título */}
          <h2 className="text-center text-foreground text-xl font-semibold mb-2">
            Crie sua senha
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-6">
            Defina uma senha para acessar o CRM Imaculada
          </p>

          {/* Email do usuário */}
          {userEmail && (
            <div className="bg-muted/50 rounded-lg p-3 mb-6 text-center">
              <p className="text-xs text-muted-foreground mb-1">Seu login</p>
              <p className="text-sm font-medium text-foreground">{userEmail}</p>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="h-12 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="h-12 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full transition-colors"
            >
              {loading ? "Salvando..." : "Definir Senha"}
            </Button>
          </form>

          <p className="mt-6 text-xs text-center text-muted-foreground">
            Ao criar sua senha, você concorda com nossos{" "}
            <a href="#" className="text-accent hover:text-accent/80 transition-colors underline">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="#" className="text-accent hover:text-accent/80 transition-colors underline">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
