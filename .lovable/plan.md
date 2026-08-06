# Diagnóstico do disparo atual + botão de pausar campanha

## O que aconteceu na campanha "Envio EM Massa queda SELIC"

Verifiquei no banco a campanha iniciada hoje às 13:02 (horário de Brasília), público de 2.745 leads:

- 505 destinatários já processados (20 bloqueados por conversa ativa, 3 sem telefone)
- Status real de entrega vindo do webhook da Meta:
  - 284 falharam com "Business eligibility payment issue" (o erro de pagamento)
  - 47 falharam com "Message undeliverable"
  - 8 falharam por "healthy ecosystem engagement"
  - 31 entregues
  - 9 lidos
  - 7 ainda em "sent" (aguardando confirmação)
  - 97 ainda sem status recebido

**Ou seja: não foi tudo perdido.** Pelo menos 40 mensagens chegaram (31 entregues + 9 lidas) e 7 ainda podem chegar. As 284 com erro de pagamento não chegaram ao lead.

Importante: a campanha continua marcada como "enviando" e o loop de envio roda no navegador de quem disparou — se a aba estiver aberta, ela continua tentando enviar mesmo com a conta suspensa por pagamento.

## Por que o histórico mostrava "enviado" para todo mundo

A Meta aceita a requisição (HTTP 200) e só depois informa a falha via webhook. Então o registro nasce como "enviado" e o status verdadeiro chega depois em `chat_messages.delivery_status`. O painel de métricas do histórico já lê esse status — é onde os 284 erros de pagamento aparecem.

## O que vou implementar

1. **Botão "Pausar/Interromper" durante o disparo**
   - No card de progresso da campanha, ao lado da barra, um botão "Interromper envio".
   - Interrompe o loop no próximo lead (não cancela mensagens já enviadas à Meta).
   - Marca a campanha como `interrompida` no banco, com os totais reais até o momento.

2. **Parada automática por erro de conta**
   - Se a resposta da Meta indicar problema de elegibilidade/pagamento da conta, o disparo para sozinho e mostra um aviso claro, em vez de queimar milhares de tentativas.

3. **Retomar campanhas travadas em "enviando"**
   - No histórico, campanhas com status `enviando` cuja última tentativa é antiga passam a mostrar o rótulo "interrompida" e um botão para marcá-las como encerradas.
   - Inclui a campanha atual, para que ela não fique presa em "enviando".

4. **Erro visível no histórico**
   - A linha do destinatário passa a exibir o motivo da falha (ex.: "problema de pagamento na conta"), facilitando reenvio depois que o pagamento for regularizado.

## Detalhes técnicos

- `src/components/campanhas/CampanhaBuilder.tsx`: `useRef` de cancelamento consultado a cada iteração do loop; botão de interromper; detecção de erro de conta na resposta da edge function `send-whatsapp-message`; update final com status `interrompida`.
- `src/components/campanhas/CampanhasHistory.tsx`: badge para `interrompida`, ação de encerrar campanha presa em `enviando`, e exibição de `failure_reason` por destinatário.
- Sem mudanças de schema: `campanhas.status` já é texto livre.
