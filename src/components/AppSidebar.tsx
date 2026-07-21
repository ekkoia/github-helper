import { BarChart3, Users, TrendingUp, UserCog, User, Settings, LogOut, Activity, CalendarDays, MessageCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import logoFeeagro from "@/assets/logo-feeagro.png";
import logoArvoraDark from "@/assets/logo-arvora-dark.png";
import logoArvoraLight from "@/assets/logo-arvora-light.png";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const coreItems = [
  { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Chat", url: "/chat", icon: MessageCircle },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Análises", url: "/analytics", icon: TrendingUp },
];

const managementItems = [
  { title: "Usuários", url: "/usuarios", icon: UserCog },
  { title: "Equipe", url: "/equipe", icon: Users },
  { title: "Atividades", url: "/atividades", icon: Activity },
];

const accountItems = [
  { title: "Perfil", url: "/perfil", icon: User },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role, loading } = useUserRole();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Garante redirecionamento mesmo se algo travar
      window.location.href = "/auth";
    }
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/" || location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const canSeeManagement = role === 'admin' || role === 'global';

  const getRoleName = () => {
    switch (role) {
      case 'global': return 'Global';
      case 'admin': return 'Admin';
      case 'user': return 'User';
      default: return 'User';
    }
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-border bg-white dark:bg-transparent">
        <img 
          src={logoArvoraLight}
          alt="Arvora" 
          className="h-9 w-auto object-contain block dark:hidden"
        />
        <img 
          src={logoArvoraDark}
          alt="Arvora" 
          className="h-9 w-auto object-contain hidden dark:block"
        />
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* CORE Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs font-semibold uppercase px-4 mb-2">
            Core
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={active ? "bg-muted/40 text-foreground border-l-4 border-primary font-semibold" : "hover:bg-muted/50 text-muted-foreground"}
                    >
                      <NavLink to={item.url}>
                        <Icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GESTÃO Section - Only for admin/global */}
        {canSeeManagement && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-muted-foreground text-xs font-semibold uppercase px-4 mb-2">
              Gestão
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={active ? "bg-muted/40 text-foreground border-l-4 border-primary font-semibold" : "hover:bg-muted/50 text-muted-foreground"}
                    >
                        <NavLink to={item.url}>
                          <Icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* CONTA Section */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-muted-foreground text-xs font-semibold uppercase px-4 mb-2">
            Conta
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={active ? "bg-muted/40 text-foreground border-l-4 border-primary font-semibold" : "hover:bg-muted/50 text-muted-foreground"}
                    >
                      <NavLink to={item.url}>
                        <Icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3">
        {!collapsed && (
          <Card className="p-3 bg-secondary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-secondary-foreground">Plano</p>
                <p className="text-sm font-semibold text-secondary-foreground">{getRoleName()}</p>
              </div>
              <Badge variant="secondary" className="text-xs">Ativo</Badge>
            </div>
          </Card>
        )}
        
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
