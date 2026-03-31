

# Click-to-WhatsApp nos leads

## O que será feito

Adicionar um botão/ícone de WhatsApp clicável ao lado do telefone do lead em 3 locais do CRM. Ao clicar, abre o WhatsApp Web (ou app) com o número do lead preenchido, pronto para iniciar conversa.

## Locais de implementação

1. **Tabela de Leads** (`src/pages/LeadsTable.tsx`) — ícone de WhatsApp ao lado do telefone na coluna de contato
2. **Modal de Detalhes** (`src/components/LeadDetailsModal.tsx`) — botão de WhatsApp ao lado do telefone
3. **Kanban** (`src/pages/Kanban.tsx`) — ícone clicável ao lado do telefone no card

## Como funciona

- Formata o telefone removendo caracteres não numéricos e adiciona o código do Brasil (`55`) se necessário
- Gera o link `https://wa.me/55XXXXXXXXXXX` e abre em nova aba (`target="_blank"`)
- Função utilitária compartilhada `getWhatsAppUrl(telefone)` em `src/lib/utils.ts`

## Detalhes técnicos

### `src/lib/utils.ts`
Nova função:
```typescript
export function getWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
}
```

### `src/pages/LeadsTable.tsx`
Na célula do telefone (~linha 855), envolver o número num link e adicionar ícone verde de WhatsApp ao lado.

### `src/components/LeadDetailsModal.tsx`
Na seção de telefone (~linha 225), adicionar botão de WhatsApp ao lado do número.

### `src/pages/Kanban.tsx`
No card do lead (~linha 363), tornar o telefone clicável com ícone de WhatsApp.

Ícone: usar o SVG do WhatsApp via `lucide-react` (`MessageCircle` estilizado em verde) ou um ícone SVG inline simples.

