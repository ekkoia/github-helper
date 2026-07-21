## Diagnóstico

O erro `#132012 Parameter format does not match format in the created template` acontece porque o template `arv_nova_oferta_comissoes_ruais_2` foi aprovado na Meta com **header do tipo IMAGE**, mas o CRM envia o template **sem os `components`** — ou seja, sem o parâmetro de imagem que a Meta exige no header.

Confirmado no banco:
- `whatsapp_meta_templates.header_type = 'IMAGE'`
- `header_content = null` (nunca foi salvo o sample/URL da imagem)

Confirmado no código de envio (`supabase/functions/send-whatsapp-message/index.ts`), o payload de template hoje é apenas:
```json
{ "template": { "name": "...", "language": { "code": "pt_BR" } } }
```
Faltam os `components` com o parâmetro de header (imagem) — e também suporte a variáveis de body (`{{1}}`, `{{2}}`…) caso o template tenha.

## O que fazer

### 1. Persistir a mídia do header
Adicionar campo `header_media_url` (text) em `whatsapp_meta_templates` para guardar a URL pública da imagem/vídeo/documento aprovada na Meta.

### 2. UI de cadastro/edição de template (admin)
Na tela onde se cadastram templates, quando `header_type ∈ (IMAGE, VIDEO, DOCUMENT)`, exibir campo de upload/URL e salvar em `header_media_url`. Para o template atual (`arv_nova_oferta_comissoes_ruais_2`), o admin colará a URL da imagem aprovada.

### 3. Ajustar `send-whatsapp-message`
Aceitar novo parâmetro opcional `components` no body. Montar `payload.template.components` quando:
- Header for `IMAGE/VIDEO/DOCUMENT` → adiciona `{ type: "header", parameters: [{ type: "image"|"video"|"document", image: { link: header_media_url } }] }`
- Header for `TEXT` com variáveis → parâmetros de texto
- Body tiver `{{n}}` → `{ type: "body", parameters: [...] }`

### 4. Ajustar `MetaChatInput.tsx` (`sendTemplateMessage`) e `weekend-leads-followup`
Antes de invocar `send-whatsapp-message`, ler `header_type`, `header_media_url` e `body` do template selecionado, detectar variáveis (`{{1}}` etc.) e montar o array `components`. Para variáveis, no primeiro momento usar `variables_example` do banco (ou vazio se não houver) — evolução futura pode substituir por nome do lead etc.

### 5. Teste
Reenviar o template `arv_nova_oferta_comissoes_ruais_2` para o Erickson e conferir na Meta e no chat.

## Detalhes técnicos

Migração:
```sql
ALTER TABLE public.whatsapp_meta_templates
  ADD COLUMN IF NOT EXISTS header_media_url text;
```

Formato Meta esperado (exemplo para este template, sem variáveis no body):
```json
"components": [
  { "type": "header",
    "parameters": [
      { "type": "image", "image": { "link": "https://..." } }
    ]
  }
]
```
Botão URL do template atual é **estático** (`https://arvora.app/pt/login` fixo, sem `{{1}}`), então **não precisa** enviar component de button.

## Fora do escopo (não mexer agora)
- Fluxo de sincronização de templates da Meta
- Preenchimento automático de variáveis com dados do lead (nome, valor etc.) — fica para uma iteração seguinte
- Envio de templates com header VIDEO/DOCUMENT (a estrutura fica pronta, mas o teste ficará no IMAGE)
