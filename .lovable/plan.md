# Filtro de datas + métricas de campanhas

## 1. Filtro de datas na criação da campanha

No painel de filtros de `/campanhas` (ao lado de Etapa, Origem, Tag, Responsável), adicionar o mesmo padrão do dashboard:

- Select "Período": Hoje, Ontem, Últimos 7 dias, Últimos 15 dias, Últimos 30 dias, Personalizado, Todos.
- Quando "Personalizado", dois date pickers (De / Até) iguais aos usados no dashboard e em /leads.
- O filtro recorta o público pela data de criação do lead (`data_criacao`), em horário de Brasília, junto com os filtros já existentes. A paginação volta para a página 1 quando o período muda.

## 2. Filtro de datas no histórico

Aba "Histórico" ganha o mesmo seletor de período, filtrando as campanhas pela data de criação da campanha.

## 3. Métricas de entrega no histórico

Cada campanha passa a mostrar um bloco de métricas:

- **Enviados** — destinatários com envio aceito pela Meta.
- **Entregues** — chegaram no aparelho do lead.
- **Lidos** (equivalente a "abertos") — lead abriu a mensagem.
- **Erros** — falhas de envio ou falha reportada pela Meta.
- **Bloqueados** — leads pulados por conversa ativa nas últimas 24h.

Cada métrica aparece como cartão com número e percentual sobre os enviados, mais a lista de destinatários (já existente) exibindo o status individual de entrega.

### Sobre "Cliques"

O WhatsApp Cloud API não envia evento de clique em botões de template pelo webhook — só entregou/leu/falhou. Então **Cliques não é possível medir hoje** e não será exibido (em vez de mostrar um número falso). Se o template usar botão do tipo "resposta rápida", conseguimos medir *respostas* do lead; se quiser, posso incluir uma métrica "Respondidos" no lugar de Cliques em um passo seguinte.

## Detalhes técnicos

- Os status reais já existem em `chat_messages.delivery_status` (`sent`, `delivered`, `read`, `played`, `failed`), atualizados pelo trigger `apply_meta_status_to_chat_messages` a partir do webhook da Meta.
- `campanha_destinatarios` guarda `meta_message_id` no envio (50 de 68 registros atuais já têm). A métrica será calculada juntando `campanha_destinatarios.meta_message_id` com `chat_messages.meta_message_id` e agregando o melhor status por destinatário (read/played > delivered > sent > failed).
- Envios antigos sem `meta_message_id` entram apenas como "enviado" (sem status de entrega) — isso será indicado na interface.
- Arquivos afetados: `src/components/campanhas/CampanhaBuilder.tsx` (filtro de período), `src/hooks/useCampanhas.ts` (busca dos status agregados), `src/components/campanhas/CampanhasHistory.tsx` (cartões de métricas + filtro de período).
- Nenhuma mudança de schema; nada fora de `/campanhas` é alterado.
