# Mensagens duplicadas da IA no chat (João Rodrigues / 553597306855)

## O que os dados mostram

Duas linhas foram gravadas na tabela de mensagens para o mesmo momento da conversa:

| Linha | Hora (BR) | Texto do lead | Resposta da IA |
|---|---|---|---|
| 14144 | 15:34:45 | "Olá! Tenho interesse em investir com a Arvora." | "Oi, Boa tarde! Sou a Carol..." |
| 14145 | 15:35:12 | "Olá! Tenho interesse em investir com a Arvora. Boa tarde" | texto **idêntico** (mesmo hash, 195 caracteres) |

Ou seja: o lead mandou "Olá! Tenho interesse..." e, 27 segundos depois, "Boa tarde". O n8n usa acúmulo/buffer de mensagens e gravou **um novo registro com o texto acumulado**, repetindo a mesma resposta da IA no campo `bot_message`, em vez de atualizar o registro anterior.

Não é bug do CRM: o chat apenas exibe o que foi inserido. As duas linhas não têm `meta_message_id` (vêm da IA), então nada disso afeta a janela de 24h.

Isso não é isolado: nos últimos 14 dias existem **115 grupos de resposta da IA repetida** (239 linhas extras) em **90 telefones** — o mesmo padrão de buffer.

## Correção de origem (fora do CRM)

O ajuste definitivo é no fluxo n8n: quando o buffer reprocessa a mensagem acumulada, ele deve **atualizar** a linha já criada (ou não gravar de novo) em vez de inserir uma nova linha com a mesma `bot_message`. Isso é uma alteração no n8n, não no código do app.

## O que faço no CRM (proteção de exibição)

Escopo mínimo, sem tocar em janela de 24h, rodízio, RLS ou envio:

1. **Dedupe na exibição** (`src/hooks/useChatMessages.ts`): quando duas linhas consecutivas do mesmo telefone tiverem `bot_message` idêntica e diferença de tempo menor que ~2 minutos, mantenho apenas a mais recente (que traz o texto acumulado completo do lead). O assessor passa a ver "Olá! Tenho interesse em investir com a Arvora. Boa tarde" + uma única resposta da Carol.
2. Nada é apagado no banco — o histórico bruto continua íntegro para auditoria.

## Detalhes técnicos

- Filtro aplicado após ordenar por `created_at`/`id`, comparando hash simples (`bot_message` trimada) da linha anterior.
- Só considera linhas sem `meta_message_id` (origem IA/n8n), para nunca esconder mensagem real da Meta.
- Sem migração de banco, sem alteração em `MetaChatInput`, `upsert_window_from_inbound` ou triggers.
