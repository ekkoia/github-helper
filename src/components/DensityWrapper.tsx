import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useEffect } from "react";

export const DensityWrapper = ({ children }: { children: React.ReactNode }) => {
  const { preferences } = useUserPreferences();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    
    if (preferences?.density) {
      root.classList.add(`density-${preferences.density}`);
    } else {
      root.classList.add('density-comfortable'); // padrão
    }
  }, [preferences?.density]);

  return <>{children}</>;
};
