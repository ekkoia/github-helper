
# Plano: Simplificar Formulário de Novo Lead

## Resumo
Modificar o modal de criação de lead para exibir apenas os campos essenciais: Nome Completo, Telefone, E-mail, Qtd Cotas, Valor Investido e Observações, reaproveitando as colunas existentes no banco de dados.

---

## Mapeamento de Campos

| Campo no Formulario | Coluna no Banco | Tipo |
|---------------------|-----------------|------|
| Nome Completo | `nome_completo` | text |
| Telefone | `telefone` | text |
| E-mail | `email` | text |
| Qtd Cotas | `volume` | text |
| Valor Investido | `valor_produto` | numeric |
| Observacoes | `observacoes` | text |

---

## Arquivos a Modificar

### 1. src/lib/validations.ts
- Simplificar o schema `leadSchema` removendo campos nao utilizados
- Manter apenas: `nome_completo`, `telefone`, `email`, `volume` (Qtd Cotas), `valor_produto` (Valor Investido), `etapa_funil`, `observacoes`
- Ajustar labels nos erros para refletir novos nomes (ex: "Qtd Cotas")

### 2. src/components/LeadForm.tsx
- Remover todas as secoes: Identificacao (manter apenas nome, telefone, email), Negociacao, Localizacao, Dados Tecnicos
- Criar layout simplificado com:
  - Nome Completo (obrigatorio)
  - Telefone (obrigatorio)
  - E-mail (obrigatorio)
  - Qtd Cotas (opcional, usa campo `volume`)
  - Valor Investido (opcional, usa campo `valor_produto`)
  - Observacoes (opcional)
- Remover constantes e logica relacionadas a perfil, etapa_funil, estados, royalties, etc.
- Manter etapa_funil como valor padrao "Novo Lead" (enviado automaticamente)
- Manter perfil como valor padrao para compatibilidade

### 3. supabase/functions/webhook-lead/index.ts
- Atualizar validacao para refletir novos campos obrigatorios
- Remover validacao de `perfil` como obrigatorio (sera opcional)
- Adicionar suporte para campos `qtd_cotas` e `valor_investido` como aliases

---

## Layout do Novo Formulario

```text
+------------------------------------------+
|           Novo Lead                      |
+------------------------------------------+
| Nome Completo *                          |
| [________________________]               |
|                                          |
| Telefone *              E-mail *         |
| [____________]          [______________] |
|                                          |
| Qtd Cotas               Valor Investido  |
| [____________]          R$ [___________] |
|                                          |
| Observacoes                              |
| [                                      ] |
| [                                      ] |
|                                          |
|              [Cancelar]  [Criar Lead]    |
+------------------------------------------+
```

---

## Detalhes Tecnicos

### Validacao Atualizada (validations.ts)
- `nome_completo`: string, min 3 chars, max 100 chars, obrigatorio
- `telefone`: string, formato brasileiro, obrigatorio
- `email`: string, formato email valido, obrigatorio
- `volume`: string, opcional (Qtd Cotas)
- `valor_produto`: number, positivo, opcional (Valor Investido)
- `etapa_funil`: string, valor padrao "Novo Lead"
- `observacoes`: string, max 1000 chars, opcional

### Campos Enviados ao Banco
O formulario continuara enviando valores defaults para campos removidos:
- `perfil`: null (nao mais obrigatorio)
- `etapa_funil`: "Novo Lead" (automatico)
- Demais campos: null

### Compatibilidade
- O modal de edicao completo pode ser mantido separadamente se necessario para editar leads existentes com todos os campos
- Leads criados pelo webhook continuam funcionando normalmente
