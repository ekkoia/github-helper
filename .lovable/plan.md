

# Correcao DEFINITIVA: largura das colunas do Kanban no mobile

## Causa raiz real

Todas as tentativas anteriores usaram `calc(100vw - Xrem)`. O problema e que `100vw` mede a largura do viewport (iframe), mas o espaco real disponivel para o Kanban e menor por causa de multiplas camadas de padding e containers:

```text
Viewport (100vw)
  SidebarProvider wrapper (w-full, overflow-x-hidden)
    div.flex-1 (largura variavel)
      main (p-4, overflow-x-hidden)  <-- 32px removidos
        Leads div (px-0 no kanban mobile)
          Kanban
            scrollContainer (w-full, overflow-x-auto)  <-- ESPACO REAL
              flex container
                coluna (min-w-[calc(100vw-X)])  <-- NUNCA BATE COM O ESPACO REAL
```

Nenhum calculo com `vw` vai funcionar de forma confiavel porque a largura real do scroll container depende de fatores dinamicos (largura do iframe, sidebar, padding do Layout).

## Solucao definitiva

Medir a largura REAL do scroll container com JavaScript e usar esse valor como largura das colunas no mobile. Isso funciona independentemente de qualquer container pai.

## Detalhes Tecnicos

### Arquivo: `src/pages/Kanban.tsx`

1. Adicionar estado `columnWidth` para guardar a largura medida do container
2. Usar `useEffect` com `ResizeObserver` no `scrollContainerRef` para medir a largura real disponivel
3. Importar `useIsMobile` de `@/hooks/use-mobile`
4. No mobile, aplicar a largura medida via `style={{ minWidth: columnWidth }}` em cada coluna
5. No desktop, manter o comportamento atual com `md:min-w-[320px]`
6. Remover a classe `min-w-[calc(100vw-2.5rem)]` que nunca funcionou

Trecho principal da mudanca:

```typescript
const isMobile = useIsMobile();
const [columnWidth, setColumnWidth] = useState(0);

useEffect(() => {
  const container = scrollContainerRef.current;
  if (!container) return;
  
  const observer = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width;
    if (width) setColumnWidth(width - 16); // 16px de margem
  });
  
  observer.observe(container);
  return () => observer.disconnect();
}, []);
```

Na coluna, trocar a classe CSS por estilo inline no mobile:

```tsx
<div
  key={etapa}
  className="md:min-w-[320px] flex-shrink-0 snap-start"
  style={isMobile && columnWidth > 0 ? { minWidth: columnWidth } : undefined}
>
```

### Nenhuma alteracao em outros arquivos

A mudanca em `Leads.tsx` (px-0 no mobile para kanban) ja feita esta correta e sera mantida.

