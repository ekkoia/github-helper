

# Adicionar exportação em Excel (XLSX)

## O que muda

**Arquivo `src/lib/exportUtils.ts`**: Criar uma função `exportToXLSX` que gera um arquivo `.xlsx` real usando a biblioteca `xlsx` (SheetJS). Reutiliza os mesmos headers e lógica de mapeamento de dados já existentes no `exportToCSV`.

**Arquivo `src/pages/LeadsTable.tsx`**: Adicionar um seletor de formato (CSV / Excel) no popover de exportação, antes do botão "Exportar". O `handleExport` chamará `exportToCSV` ou `exportToXLSX` conforme o formato selecionado.

**Dependência**: Instalar o pacote `xlsx` (SheetJS) — biblioteca leve e sem dependências para gerar arquivos Excel no browser.

## Detalhes técnicos

1. **Instalar** `xlsx` via npm
2. **`exportUtils.ts`**: Extrair a lógica de construção de headers/rows para uma função compartilhada. Criar `exportToXLSX` que usa `XLSX.utils.aoa_to_sheet` + `XLSX.writeFile`
3. **`LeadsTable.tsx`**:
   - Novo estado `exportFormat` (`"csv"` | `"xlsx"`, default `"csv"`)
   - Adicionar um `Select` de formato no popover (entre o seletor de período e o botão)
   - Atualizar `handleExport` para chamar a função correta
   - Atualizar o label do botão e aria-label
   - Atualizar o log de atividade com o formato

