import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, TableProperties, LayoutGrid, Wheat, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { path: "/", label: "Dashboard", icon: BarChart3 },
    { path: "/tabela", label: "Tabela", icon: TableProperties },
    { path: "/kanban", label: "Kanban", icon: LayoutGrid },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-white hover:bg-white/10"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Wheat className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-base font-bold">Imaculada Agronegócios</div>
              <div className="text-xs text-muted-foreground">Negociação de Grãos</div>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-8 flex flex-col gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all duration-300",
                  isActive
                    ? "bg-secondary text-white shadow-elevation-2"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
};
