## Diagnóstico

Consultei o banco e os valores reais de `leads.origem` hoje são apenas:

| origem | qtd |
|---|---|
| `meta_form` | 1294 |
| `whatsapp` | 1069 |
| `Form Arvora Nativo` | 46 |
| `landing_page` | 1 |
| `outro` | 1 |

Mas o `FiltersSidebar.tsx` oferece 10 opções, sendo que:

- **`meta_form`** e **`formulario_meta`** aparecem duas vezes com o **mesmo rótulo** "Formulário Nativo Meta". Só `meta_form` existe no banco — a segunda opção nunca retorna nada.
- **`Form Arvora Nativo`** (46 leads) **não tem opção no filtro**, então esses leads ficam invisíveis por origem.
- **`instagram_ads`, `facebook_ads`, `campanha_mensagem`, `indicacao`, `site`, `importacao_planilha`** não existem no banco — todas retornam vazio.
- **`landing_page`** existe no banco mas a opção do filtro está como `site`.

O filtro usa igualdade estrita (`lead.origem === filters.origem`), por isso qualquer descasamento resulta em "Nenhum lead encontrado".

## Ajuste (só no filtro, sem mexer em lógica de negócio)

Reescrever a lista `ORIGEM_OPTIONS` em `src/components/FiltersSidebar.tsx` para refletir os valores reais:

- Remover a opção duplicada `formulario_meta`.
- Adicionar `Form Arvora Nativo` (valor idêntico ao gravado no banco).
- Trocar `site` por `landing_page` para casar com o dado real.
- Remover opções sem nenhum lead correspondente (`instagram_ads`, `facebook_ads`, `campanha_mensagem`, `indicacao`, `importacao_planilha`) para não confundir. Se no futuro passarem a existir, adicionamos.

Lista final:

```text
meta_form           → "Formulário Nativo Meta"
Form Arvora Nativo  → "Form Arvora Nativo"
whatsapp            → "WhatsApp"
landing_page        → "Site/Landing Page"
outro               → "Outro"
```

Também vou garantir que `ORIGEM_LABELS` em `src/pages/LeadsTable.tsx` (usado na coluna da tabela) tenha entrada para `Form Arvora Nativo` e `landing_page`, para o badge exibir rótulo amigável.

Nenhuma migração de banco, nenhuma alteração no fluxo de captura/dedupe.