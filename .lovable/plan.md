
# Plano: Verticalizar Formulario de Novo Lead

## Resumo
Modificar o layout do formulario de novo lead para ser mais estreito e vertical, tornando-o mais amigavel e menos largo na tela.

---

## Alteracoes Necessarias

### 1. Reduzir Largura do Dialog
**Arquivos:** `src/pages/LeadsTable.tsx` e `src/pages/Kanban.tsx`

Alterar a classe do DialogContent:
- De: `max-w-4xl` (896px de largura)
- Para: `max-w-md` (448px de largura)

Isso tornara o modal mais compacto e centralizado na tela.

### 2. Verticalizar o LeadForm
**Arquivo:** `src/components/LeadForm.tsx`

Remover os grids de 2 colunas para empilhar todos os campos verticalmente:
- Telefone e E-mail: remover `grid grid-cols-1 md:grid-cols-2` e colocar cada campo em seu proprio bloco
- Qtd Cotas e Valor Investido: idem, colocar cada campo em seu proprio bloco

---

## Layout Resultante

```text
+---------------------------+
|       Novo Lead       [X] |
+---------------------------+
| Nome Completo *           |
| [_______________________] |
|                           |
| Telefone *                |
| [_______________________] |
|                           |
| E-mail *                  |
| [_______________________] |
|                           |
| Qtd Cotas                 |
| [_______________________] |
|                           |
| Valor Investido (R$)      |
| [_______________________] |
|                           |
| Observacoes               |
| [_______________________] |
| [_______________________] |
|                           |
|    [Cancelar] [Criar Lead]|
+---------------------------+
```

---

## Detalhes Tecnicos

### LeadForm.tsx - Mudancas
```text
Antes (linhas 108-124):
- <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
-   <div>Telefone</div>
-   <div>E-mail</div>
- </div>

Depois:
- <div>Telefone</div>
- <div>E-mail</div>
```

O mesmo sera aplicado para Qtd Cotas e Valor Investido (linhas 126-148).

### DialogContent - Mudancas
```text
Antes:
- className="max-w-4xl max-h-[90vh] overflow-y-auto"

Depois:
- className="max-w-md max-h-[90vh] overflow-y-auto"
```

---

## Arquivos a Modificar

1. `src/components/LeadForm.tsx` - Remover grids horizontais
2. `src/pages/LeadsTable.tsx` - Reduzir largura do Dialog
3. `src/pages/Kanban.tsx` - Reduzir largura do Dialog
