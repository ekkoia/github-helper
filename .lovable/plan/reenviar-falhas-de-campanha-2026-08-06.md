# Reenviar falhas de campanha

## Diagnóstico confirmado (campanha "Envio EM Massa queda SELIC")

- Público filtrado: 2.745 leads; limite escolhido: 1.000.
- Registrados apenas 559 destinatários: 536 enviados, 20 bloqueados (janela 24h ativa), 3 sem telefone. O loop parou em ~536 de 1.000 (13:03 → 13:23 BRT).
- Status no banco continua `enviando` (painel mostra "Interrompida (sem resposta)").
- Entrega real dos 536: 25 lidas, 29 entregues, 9 em trânsito, 365 falhas, 108 sem status.
- Falhas: 303 "Business eligibility payment issue", 51 "Message undeliverable", 10 bloqueio de ecossistema, 1 experimento.

Conclusão: a maior parte falhou por problema de pagamento/elegibilidade da conta Meta — falha recuperável após regularizar.

## O que será construído

Botão **"Reenviar falhas"** em cada campanha do histórico (`/campanhas`), visível apenas quando existirem falhas recuperáveis.

Comportamento:

1. Carrega os destinatários da campanha e cruza com o status real de entrega da Meta.
2. Considera **recuperável** apenas: erro de conta/pagamento/elegibilidade, `access token`, `not configured`. Erros definitivos ("Message undeliverable", "healthy ecosystem engagement", "experiment", sem telefone) ficam de fora — reenviar não resolve.
3. Antes de disparar, revalida cada lead: pula quem passou a ter janela de 24h aberta (conversa ativa com assessor) e quem já foi entregue/lido depois.
4. Dispara o mesmo template da campanha, com a mesma pausa entre envios e a mesma parada automática ao detectar erro de conta na primeira tentativa (evita queimar centenas de envios se o pagamento ainda não foi regularizado).
5. Mostra progresso ("reenviando X de Y") e botão **Interromper**.
6. Registra o reenvio: atualiza o destinatário com o novo `meta_message_id` e limpa o erro anterior; insere a mensagem em `chat_messages` para o assessor dono do lead, como no disparo original.
7. Ao final, exibe resumo (reenviados / novas falhas / pulados) e atualiza contadores da campanha.

Restrições de permissão mantidas: usuários não-admin só reenviam para leads atribuídos a eles.

## Detalhes técnicos

- `src/hooks/useCampanhas.ts`: nova função `fetchFalhasRecuperaveis(campanhaId)` (junta `campanha_destinatarios` + `chat_messages.delivery_status/failure_reason`), classificador `isFalhaRecuperavel(motivo)` compartilhado, e `atualizarDestinatarioReenvio(...)`.
- `src/components/campanhas/CampanhasHistory.tsx`: botão "Reenviar falhas" com contador, diálogo de confirmação, barra de progresso e botão de interromper.
- Loop de reenvio reaproveitado a partir da lógica de `CampanhaBuilder.tsx` (mesma invocação de `send-whatsapp-message`, `formatPhoneForMeta`, checagem de janela 24h e detecção `isErroDeConta`), extraída para um módulo compartilhado para não duplicar regra.
- Nenhuma mudança no schema do banco; nenhuma alteração no fluxo de criação de campanha existente.
