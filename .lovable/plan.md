
# Corrigir Mapeamento de Valor Investido no Webhook

## Problema Identificado

O webhook não está mapeando o valor investido porque:

1. **Campo enviado errado**: Você enviou `valor_investido`, mas o webhook espera `valor_produto`
2. **Tipo de dado incorreto**: O campo espera número (`100000`), mas você enviou texto (`"Acima de R$100 mil"`)

Logs comprovam:
```
Received: { valor_investido: "Acima de R$100 mil" }
Created:  { valor_produto: null }
```

## Solução Proposta

Atualizar o webhook para:
1. Aceitar `valor_investido` como alias de `valor_produto`
2. Converter faixas de texto para valores numéricos

## Alteracoes no Webhook

### 1. Atualizar Interface (Aceitar Ambos os Campos)

```typescript
interface LeadWebhookData {
  // ... campos existentes
  valor_produto?: number | string;    // Aceita numero ou texto
  valor_investido?: number | string;  // Alias para valor_produto
}
```

### 2. Adicionar Funcao de Conversao de Faixas

```typescript
const parseValorInvestido = (value: any): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // Se ja for numero, retorna direto
  if (typeof value === 'number') {
    return value;
  }
  
  // Converte string para lowercase para comparacao
  const valorStr = String(value).toLowerCase().trim();
  
  // Mapeamento de faixas de texto para valores numericos (topo da faixa)
  const faixas: Record<string, number> = {
    'até r$10 mil': 10000,
    'ate r$10 mil': 10000,
    'de r$10 mil a r$50 mil': 50000,
    'de r$50 mil a r$100 mil': 100000,
    'acima de r$100 mil': 150000,
  };
  
  // Verifica se eh uma faixa conhecida
  for (const [faixa, valor] of Object.entries(faixas)) {
    if (valorStr.includes(faixa) || faixa.includes(valorStr)) {
      return valor;
    }
  }
  
  // Tenta extrair numero da string (ex: "50000", "R$ 50.000")
  const numStr = valorStr.replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(numStr);
  
  return isNaN(parsed) ? null : parsed;
};
```

### 3. Atualizar Logica de Insercao

```typescript
// Usar valor_investido como fallback para valor_produto
const valorProdutoRaw = leadData.valor_produto ?? leadData.valor_investido;
const valorProduto = parseValorInvestido(valorProdutoRaw);

const leadToInsert = {
  // ... outros campos
  valor_produto: valorProduto,
  // ...
};
```

## Mapeamento de Faixas de Investimento

| Texto Enviado | Valor Salvo |
|---------------|-------------|
| `"até R$10 mil"` | `10000` |
| `"de R$10 mil a R$50 mil"` | `50000` |
| `"de R$50 mil a R$100 mil"` | `100000` |
| `"acima de R$100 mil"` | `150000` |
| `50000` (numero) | `50000` |
| `"R$ 75.000,00"` (texto) | `75000` |

## Exemplos de Payload Validos Apos Correcao

**Exemplo 1 - Usando valor_investido (texto)**
```json
{
  "nome_completo": "João Silva",
  "telefone": "+55 11 99999-9999",
  "email": "joao@email.com",
  "valor_investido": "Acima de R$100 mil",
  "origem": "whatsapp"
}
```
Resultado: `valor_produto = 150000`

**Exemplo 2 - Usando valor_produto (numero)**
```json
{
  "nome_completo": "Maria Santos",
  "telefone": "+55 11 88888-8888",
  "email": "maria@email.com",
  "valor_produto": 75000,
  "origem": "instagram_ads"
}
```
Resultado: `valor_produto = 75000`

**Exemplo 3 - Usando valor_produto (texto formatado)**
```json
{
  "nome_completo": "Pedro Costa",
  "telefone": "+55 11 77777-7777",
  "email": "pedro@email.com",
  "valor_produto": "R$ 50.000,00",
  "origem": "whatsapp"
}
```
Resultado: `valor_produto = 50000`

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/webhook-lead/index.ts` | Adicionar alias e conversao de faixas |

## Documentacao do Webhook Atualizada

### Campos Aceitos

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `nome_completo` | string | Sim | Nome completo do lead |
| `telefone` | string | Sim | Telefone com DDD |
| `email` | string | Sim | Email valido |
| `valor_produto` | number/string | Nao | Valor investido (numero ou faixa) |
| `valor_investido` | number/string | Nao | Alias para valor_produto |
| `etapa_funil` | string | Nao | Etapa do funil (default: "Novo Lead") |
| `origem` | string | Nao | Origem do lead (whatsapp, instagram_ads, etc) |
| `observacoes` | string | Nao | Observacoes adicionais |

### Faixas de Investimento Aceitas

O sistema converte automaticamente estas faixas para valores numericos:
- `"até R$10 mil"` → 10.000
- `"de R$10 mil a R$50 mil"` → 50.000
- `"de R$50 mil a R$100 mil"` → 100.000
- `"acima de R$100 mil"` → 150.000

Voce tambem pode enviar valores numericos diretamente ou strings formatadas como `"R$ 75.000,00"`.
