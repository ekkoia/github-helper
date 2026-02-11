import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import logoFeeagro from "@/assets/logo-feeagro-auth.png";

const authSchema = z.object({
  nome: z.string().trim().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }).max(100),
  email: z.string().trim().email({ message: "Email inválido" }).max(255),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe seu email");
      return;
    }
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast.error("Erro ao enviar link: " + error.message);
      } else {
        toast.success("Link de recuperação enviado! Verifique seu email.");
      }
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLogin) {
        authSchema.parse({ nome: "placeholder", email, password });
      } else {
        authSchema.parse({ nome, email, password });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou senha incorretos");
          } else {
            toast.error("Erro ao fazer login: " + error.message);
          }
        } else {
          toast.success("Login realizado com sucesso!");
          navigate("/dashboard");
        }
      } else {
        const { error } = await signUp(email, password, nome);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Este email já está cadastrado");
          } else {
            toast.error("Erro ao criar conta: " + error.message);
          }
        } else {
          toast.success("Conta criada com sucesso!");
          navigate("/dashboard");
        }
      }
    } catch (error) {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error("Erro ao fazer login com Google");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-elevation-3 p-8 border border-border/50">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 bg-primary rounded-full shadow-elevation-2 flex items-center justify-center p-4">
              <img 
                src={logoFeeagro} 
                alt="Feeagro" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Título */}
          <h2 className="text-center text-muted-foreground text-sm mb-6 font-medium">
            {isForgotPassword ? "Recuperar senha" : isLogin ? "Entre com suas credenciais" : "Crie sua conta"}
          </h2>

          {/* Formulário */}
          <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-sm font-medium text-foreground">
                  Nome Completo
                </Label>
                <Input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="h-12"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-12"
                required
              />
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
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
            )}

            {isLogin && !isForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full transition-colors"
            >
              {loading ? "Carregando..." : isForgotPassword ? "Enviar link de recuperação" : isLogin ? "Entrar" : "Criar Conta"}
            </Button>

            {!isForgotPassword && (
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                variant="outline"
                className="w-full h-12 rounded-full font-medium hover:bg-muted/50 transition-colors"
              >
                <img 
                  src="https://www.google.com/favicon.ico" 
                  alt="Google" 
                  className="w-5 h-5 mr-2"
                />
                Continuar com Google
              </Button>
            )}
          </form>

          <div className="mt-6 text-center text-sm">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-accent hover:text-accent/80 font-semibold transition-colors"
              >
                ← Voltar ao login
              </button>
            ) : (
              <>
                <span className="text-muted-foreground">
                  {isLogin ? "Não tem uma conta? " : "Já tem uma conta? "}
                </span>
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-accent hover:text-accent/80 font-semibold transition-colors"
                >
                  {isLogin ? "Cadastre-se grátis!" : "Faça login"}
                </button>
              </>
            )}
          </div>

          {!isLogin && !isForgotPassword && (
            <p className="mt-4 text-xs text-center text-muted-foreground">
              Ao criar uma conta, você concorda com nossos{" "}
              <a href="#" className="text-accent hover:text-accent/80 transition-colors underline">
                Termos de Uso
              </a>{" "}
              e{" "}
              <a href="#" className="text-accent hover:text-accent/80 transition-colors underline">
                Política de Privacidade
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
