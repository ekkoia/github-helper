# Ajustar contraste do checkbox em /campanhas no dark mode

## Objetivo
Os checkboxes da lista de leads na página `/campanhas` estão quase invisíveis no dark mode. Ajustar o estilo para que fiquem claramente visíveis, tanto no estado não marcado quanto no marcado, sem alterar o comportamento de seleção/envio.

## Contexto verificado
- Componente: `src/components/campanhas/CampanhaBuilder.tsx` (linhas 638, 674).
- Checkbox base: `src/components/ui/checkbox.tsx` (shadcn/Radix) usa `border border-primary` como padrão.
- Em fundo escuro do tema Feeagro, a borda `border-primary` fica com contraste muito baixo, dificultando a visualização.

## Plano de mudança
1. Adicionar classes de contraste localmente aos `<Checkbox>` do `CampanhaBuilder` (header e linhas da tabela):
   - Borda mais visível: `border-foreground/50` ou `border-muted-foreground` (com fallback para `border-primary` em light mode, se necessário).
   - Fundo sutil no estado não marcado: `bg-background` (já é o padrão, mas confirmar que não herda `bg-muted`).
   - Garantir que o estado marcado continue com `bg-primary` e `text-primary-foreground` legível.
2. Garantir que o hover/focus continue acessível (manter `focus-visible:ring-ring`).
3. Não alterar outros componentes ou funcionalidades fora do escopo visual.
4. Verificar o resultado no preview em dark mode.

## Técnica
- Edição pontual em `src/components/campanhas/CampanhaBuilder.tsx`, passando `className` nos dois `<Checkbox>`.
- Build/TypeScript para garantir que a alteração não quebre nada.
- Visualização rápida no preview para confirmar melhoria de contraste.
