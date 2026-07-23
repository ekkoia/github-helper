## Diagnóstico

Analisando `supabase/functions/webhook-lead/index.ts` no bloco de deduplicação (linhas 168-250), identifiquei a causa:

Quando o lead **já existe** (caso do print — o mesmo contato entrou primeiro pela sincronização Meta e depois pelo "Form Arvora Nativo"), o merge atual:

1. **Ignora completamente o `observacoes` recebido no payload** — só anexa a nota genérica `"[timestamp] Dados atualizados via webhook (origem: Form Arvora Nativo)"`. Por isso o campo Observações só mostra o header do primeiro cadastro + os timestamps, sem o bloco "INFORMAÇÕES COMPLEMENTARES / Valor pretendido / Hora do cadastro".
2. **Não atualiza `valor_produto`** (o campo que armazena o valor investido) — o merge só toca em `perfil, intencao, tipo_grao, volume, cidade, uf, origem`. Se o lead veio primeiro sem valor, ele fica sem valor pra sempre.
3. Não preenche outros campos numéricos/texto vazios (`distancia_km`, `qualidade`, `armazenamento`, etc.) que também podem chegar pelo Form Arvora Nativo.

Para leads **novos** (não duplicados) tudo funciona — o bloco de inserção (linhas 358-388) já parseia `valor_investido` corretamente via `parseValorInvestido`.

## Correção

Editar apenas o bloco de merge em `supabase/functions/webhook-lead/index.ts`:

1. **Ampliar o `select` do `existingLead`** para trazer também `valor_produto`, `volume`, `tipo_grao`, `perfil`, `intencao`, `cidade`, `uf`, `distancia_km`, `sentido`, `estrada_terra_km`, `armazenamento`, `qualidade`, `tem_royalties`, `percentual_royalties`, `localizacao_embarque` — para poder decidir "só preenche se estiver vazio".

2. **Anexar `observacoes` recebidas do payload** ao campo `observacoes` do lead existente, além da nota de merge:
   ```
   observacoes_atual
   + "\n\n" + observacoes_recebidas   (se vieram no payload e ainda não estão lá)
   + "\n[timestamp] Dados atualizados via webhook (origem: ...)"
   ```
   Com dedupe simples pra não duplicar o mesmo bloco em disparos repetidos (checar se o texto já está contido).

3. **Atualizar `valor_produto` quando estiver vazio no lead existente**, reutilizando o mesmo `parseValorInvestido` já definido mais abaixo no arquivo (mover a função pra antes do bloco de merge, ou duplicar a lógica). Aceita `valor_produto` ou `valor_investido` do payload.

4. **Preencher demais campos vazios** com "fill only if empty": para cada campo do payload, só grava se `existingLead.<campo>` for null/vazio. Reutilizar os parsers/normalizações (`parseNumericValue`, `parseVolumeToString`, `armazenamentoLookup`, `sentidoLookup`) — mover essas helpers/constantes pra antes do bloco de merge para poderem ser usadas nos dois caminhos (merge e insert).

5. **Não alterar** o comportamento do path de inserção nova, nem qualquer outra função/tabela/trigger.

## Detalhes técnicos

- Arquivo único alterado: `supabase/functions/webhook-lead/index.ts`.
- Sem migrations, sem mudanças de schema, sem mudanças em outros edge functions ou no frontend.
- Deploy automático ao salvar.
- Efeito colateral esperado: próximos disparos do "Form Arvora Nativo" pra leads já existentes passam a preencher `valor_produto` e a acumular o bloco "INFORMAÇÕES COMPLEMENTARES" em `observacoes`.

## Backfill (opcional, pergunto antes de fazer)

Os leads que **já foram** duplicados no passado continuam com `valor_produto = null` e sem o bloco complementar em `observacoes` — o fix só corrige do momento do deploy pra frente. Se quiser, posso depois:
- rodar um script que reprocesse os últimos N dias de eventos do Form Arvora Nativo (se tivermos o payload guardado em algum lugar), ou
- pedir pro n8n reenviar os disparos recentes.

Me diz se quer que eu inclua o backfill nesta rodada ou deixe só o fix do fluxo daqui pra frente.
