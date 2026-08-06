# Paginação e limite de leads em /campanhas

## O que muda

1. **Paginação na lista de leads**
   - A tabela de pré-visualização passa a mostrar uma página por vez, em vez dos 500 primeiros.
   - Rodapé com: "Mostrando X–Y de Z", botões Anterior/Próxima e o número da página.
   - Seletor "Itens por página" com as opções **20, 50, 100 e 500** (padrão 50).
   - Ao mudar filtros, busca ou itens por página, volta para a página 1.
   - O checkbox do cabeçalho passa a marcar/desmarcar **os leads da página atual** (com estado indeterminado quando parcial), e fica um atalho separado "Marcar todos do filtro / Desmarcar todos".

2. **Quantidade de leads para a campanha (limite de disparo)**
   - Novo campo "Limite de envios" ao lado dos filtros, com opções **20, 50, 100, 500 e Todos** (padrão Todos).
   - O limite se aplica sobre os leads elegíveis marcados, na ordem da lista: se houver 300 elegíveis e o limite for 100, apenas os 100 primeiros são disparados.
   - O resumo passa a mostrar "N serão enviados (limite: X)" e o texto de confirmação do disparo usa esse mesmo número.

Nada mais muda: o bloqueio automático de leads com janela de 24h aberta, o registro no chat do assessor dono, o histórico e as permissões continuam exatamente como estão.

## Detalhes técnicos

Somente `src/components/campanhas/CampanhaBuilder.tsx`:

- Novos estados: `page`, `pageSize` (20 | 50 | 100 | 500), `limite` ("all" | 20 | 50 | 100 | 500).
- `paginaAtual = useMemo(() => publico.slice((page-1)*pageSize, page*pageSize), ...)`, `totalPages = Math.ceil(publico.length / pageSize)`.
- `useEffect` reseta `page` para 1 quando `publico.length`, filtros ou `pageSize` mudam.
- `elegiveisParaEnvio = limite === "all" ? elegiveis : elegiveis.slice(0, limite)`; a função de envio e `canSend` usam essa lista em vez de `elegiveis`.
- `toggleAll` opera sobre `paginaAtual`; novos handlers `marcarTodosFiltro` / `desmarcarTodosFiltro` para o filtro inteiro.
- Remove o aviso "Exibindo os 500 primeiros" e o `slice(0, 500)` do render.
- Componentes existentes: `Select` para os seletores e `Button` para navegação de páginas.
