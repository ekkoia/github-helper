## Objetivo
Adicionar separadores de data entre grupos de mensagens no `/chat`, igual ao app do WhatsApp (ex: "Hoje", "Ontem", "quarta-feira", "15/07/2026").

## Onde mexer
Apenas em `src/components/chat/ChatWindow.tsx` (renderização da lista de mensagens). Nenhuma alteração em banco, hooks ou lógica de envio.

## Como fica

### 1. Agrupamento por dia
No render de `messages`, iterar em ordem e comparar a data (fuso `America/Sao_Paulo`, via `toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })`) da mensagem atual com a anterior. Quando mudar, inserir um separador antes do `MessageBubble`.

### 2. Rótulo do separador
Função auxiliar `formatDayLabel(date)` retornando:
- "Hoje" → se for o dia atual
- "Ontem" → se for o dia anterior
- Nome do dia da semana em pt-BR (ex: "quarta-feira") → se estiver nos últimos 7 dias
- Data completa `dd/MM/yyyy` → mais antigo que isso

Comparações feitas com strings `YYYY-MM-DD` no fuso de São Paulo para evitar bugs de UTC.

### 3. Visual do separador
Estilo WhatsApp: pill centralizado, discreto, sem quebrar o layout atual.
```tsx
<div className="flex justify-center my-3">
  <span className="px-3 py-1 rounded-full bg-card border border-border text-[11px] text-muted-foreground shadow-sm">
    {label}
  </span>
</div>
```

## Fora do escopo
- Não alterar `MessageBubble`, `useChatMessages`, nem a ordenação já existente (ascending).
- Não mexer em janelas de 24h, IA, templates ou realtime.
- Sem migrações.
