

# Correção do Erro de Build e Configuração de Secrets

## Problema Identificado

O campo `tem_royalties` na tabela `leads` está definido como `boolean` no banco de dados, mas o formulário e a validação Zod usam valores de string ("Sim", "Não", "Não informado").

**Tipo no banco:**
```
tem_royalties: boolean | null
```

**Tipo no formulário:**
```
tem_royalties: z.enum(["Sim", "Não", "Não informado"])
```

## Solução

Converter o valor de string para boolean antes de enviar ao banco, e de boolean para string ao carregar dados existentes.

---

## Arquivos a Modificar

### 1. src/components/LeadForm.tsx

**Mudanças:**
- Na função `onSubmit`, converter `tem_royalties` de string para boolean:
  - "Sim" → `true`
  - "Não" → `false`  
  - "Não informado" → `null`

- Nos `defaultValues`, converter de boolean para string ao editar um lead existente

**Código atualizado para `submitData`:**
```typescript
// Converter tem_royalties de string para boolean
let temRoyaltiesValue: boolean | null = null;
if (data.tem_royalties === "Sim") {
  temRoyaltiesValue = true;
} else if (data.tem_royalties === "Não") {
  temRoyaltiesValue = false;
}

const submitData = {
  // ... outros campos
  tem_royalties: temRoyaltiesValue,
  // ... resto
};
```

**Código atualizado para `defaultValues`:**
```typescript
defaultValues: initialData ? {
  ...initialData,
  // Converter boolean para string
  tem_royalties: initialData.tem_royalties === true 
    ? "Sim" 
    : initialData.tem_royalties === false 
      ? "Não" 
      : "Não informado",
  // ... outros campos
} : {
  etapa_funil: "Novo Lead",
  tem_royalties: "Não informado"
}
```

---

## Configuração de Secrets

Após corrigir o erro de build, vou adicionar os secrets necessários para as Edge Functions:

| Secret | Valor |
|--------|-------|
| `SITE_URL` | `https://id-preview--4857f2d3-9941-4691-862c-d1c44dc8fe55.lovable.app` |
| `RESEND_API_KEY` | `re_R2UkPR78_9kKsRV9Z9ycNBGzoS1E8jXSc` |

---

## Próximos Passos Após Implementação

1. Corrigir o erro de build no LeadForm.tsx
2. Adicionar os secrets SITE_URL e RESEND_API_KEY
3. Testar o fluxo de autenticação (criar conta)
4. Promover seu usuário para admin global via SQL
5. Testar o convite de novos usuários

