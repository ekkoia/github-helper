

# Exibir Campo de Concordância com Empréstimo no Modal de Detalhes

## Contexto

Quando um lead vem do **Formulário 02 - Formulário FeeAgro (Pergunta Empréstimo)**, precisamos exibir de forma destacada a resposta à pergunta sobre concordância de que não se trata de empréstimo.

## Fonte dos Dados

- A informação de concordância está na tabela `leadsNativo_feeagro`
- Coluna: `"Você concorda que esse formulário não trata-se de empréstim"` (valores: "sim" ou "não")
- O vínculo entre as tabelas é feito pelo **email** do lead
- O formulário 02 é identificado pela observação contendo "02 - Formulário FeeAgro (Pergunta Empréstimo)"

## Visual Proposto

Na seção **Observações** do modal, antes do texto das observações, adicionar um destaque visual:

```text
┌─────────────────────────────────────────────────────────────┐
│ Observações                                                 │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Entende que não é empréstimo?                         │ │
│ │                                                         │ │
│ │ [✓ Sim]  ou  [✗ Não]  (badge colorido)                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Valor pretendido: até R$10 mil                              │
│ Formulário: 02 - Formulário FeeAgro (Pergunta Empréstimo)   │
│ Anúncio: AD01 - I1 - 01/26                                  │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

- **Sim**: Badge verde com ícone de check
- **Não**: Badge vermelho/amarelo com ícone de alerta (destaque para atenção)

## Alterações Técnicas

### Arquivo: `src/components/LeadDetailsModal.tsx`

1. **Adicionar estado** para armazenar a resposta de concordância
2. **Buscar no Supabase** a informação da tabela `leadsNativo_feeagro` quando:
   - As observações contenham "02 - Formulário FeeAgro (Pergunta Empréstimo)"
   - Usar o email do lead para fazer o vínculo
3. **Renderizar seção destacada** acima das observações mostrando:
   - Pergunta: "Entende que não é empréstimo?"
   - Resposta: Badge colorido com "Sim" ou "Não"

### Lógica de Implementação

```typescript
// Verificar se é formulário 02
const isFormulario02 = currentLead.observacoes?.includes('02 - Formulário FeeAgro');

// Se for, buscar na tabela leadsNativo_feeagro pelo email
useEffect(() => {
  if (isFormulario02 && currentLead.email) {
    // Buscar resposta de concordância
    supabase
      .from('leadsNativo_feeagro')
      .select('"Você concorda que esse formulário não trata-se de empréstim"')
      .ilike('email', currentLead.email)
      .maybeSingle()
      .then(({ data }) => {
        setConcordaEmprestimo(data?.['Você concorda...']);
      });
  }
}, [currentLead]);
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/LeadDetailsModal.tsx` | Adicionar busca e exibição do campo de concordância |

## Resultado Esperado

- Para leads do Formulário 02: aparece destaque visual com a resposta "Sim" ou "Não"
- Para leads de outros formulários: nenhuma alteração
- Informação clara e visível para o usuário entender rapidamente a resposta

