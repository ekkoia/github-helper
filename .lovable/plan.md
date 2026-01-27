
# Plano: Adicionar Campo "Origem do Lead"

## Resumo
Adicionar um novo campo no formulário de criação de lead para identificar a origem/fonte do lead (Instagram, Meta, campanha de mensagem, formulário nativo, etc).

---

## Alterações Necessárias

### 1. Criar Nova Coluna no Banco de Dados
**Migração SQL necessária**

Criar a coluna `origem` na tabela `leads`:
- Tipo: `text`
- Nullable: sim (opcional)
- Sem valor default

### 2. Atualizar Schema de Validação
**Arquivo:** `src/lib/validations.ts`

Adicionar campo `origem` ao schema:
- Tipo: string opcional
- Limite de 100 caracteres

### 3. Atualizar LeadForm
**Arquivo:** `src/components/LeadForm.tsx`

- Adicionar campo Select para origem (antes de Observações)
- Opções pré-definidas:
  - Instagram Ads
  - Facebook Ads
  - WhatsApp
  - Formulário Nativo Meta
  - Campanha de Mensagem
  - Indicação
  - Site/Landing Page
  - Outro
- Incluir no defaultValues e submitData

### 4. Atualizar Edge Function webhook-lead
**Arquivo:** `supabase/functions/webhook-lead/index.ts`

- Adicionar suporte ao campo `origem` no payload do webhook

---

## Layout do Campo

O campo será posicionado após "Valor Investido" e antes de "Observações":

```text
+---------------------------+
| ...                       |
| Valor Investido (R$)      |
| [_______________________] |
|                           |
| Origem do Lead            |
| [▼ Selecione a origem   ] |
|                           |
| Observacoes               |
| [_______________________] |
| ...                       |
+---------------------------+
```

---

## Detalhes Técnicos

### Migração SQL
```sql
ALTER TABLE leads
ADD COLUMN origem text;

COMMENT ON COLUMN leads.origem IS 'Origem/fonte do lead (Instagram, Meta, etc)';
```

### Opções de Origem (Sugeridas)
| Valor | Descrição |
|-------|-----------|
| `instagram_ads` | Instagram Ads |
| `facebook_ads` | Facebook Ads |
| `whatsapp` | WhatsApp |
| `meta_form` | Formulário Nativo Meta |
| `campanha_mensagem` | Campanha de Mensagem |
| `indicacao` | Indicação |
| `site` | Site/Landing Page |
| `outro` | Outro |

### Arquivos a Modificar
1. **Migração SQL** - Criar coluna `origem`
2. `src/lib/validations.ts` - Adicionar campo ao schema
3. `src/components/LeadForm.tsx` - Adicionar Select de origem
4. `supabase/functions/webhook-lead/index.ts` - Aceitar campo origem no webhook
