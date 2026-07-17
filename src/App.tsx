import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DensityWrapper } from "@/components/DensityWrapper";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Auth from "./pages/Auth";
import SetPassword from "./pages/SetPassword";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import Usuarios from "./pages/Usuarios";
import Equipe from "./pages/Equipe";
import Perfil from "./pages/Perfil";
import Configuracoes from "./pages/Configuracoes";
import Atividades from "./pages/Atividades";
import Agenda from "./pages/Agenda";
import Chat from "./pages/Chat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});


const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <DensityWrapper>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/set-password" element={<SetPassword />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
                <Route path="/equipe" element={<ProtectedRoute><Equipe /></ProtectedRoute>} />
                <Route path="/atividades" element={<ProtectedRoute><Atividades /></ProtectedRoute>} />
                <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </DensityWrapper>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
