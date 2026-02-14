

# Ajustar Indicador de Multi-Origem no Modal de Detalhes

## Problema

1. O banner "Este lead interagiu por 2 canais diferentes" esta com cor invisivel no dark mode (texto e fundo sem contraste)
2. As origens (meta_form, WhatsApp) aparecem sempre como badges fixos -- o usuario quer que aparecam apenas ao clicar
3. O texto do banner precisa ser simplificado para "2 canais diferentes"

## Solucao

Substituir o layout atual por um badge clicavel que funciona como toggle:

- **Estado fechado**: Badge visivel com texto "2 canais diferentes" (com icone Layers)
- **Estado aberto**: Ao clicar, expande mostrando os badges individuais de cada origem abaixo
- Para leads com uma unica origem, manter o badge simples como esta

### Cores do badge

- Light mode: fundo `bg-blue-100 text-blue-700 border-blue-200`
- Dark mode: `dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800`
- Garantir contraste em ambos os modos

## Detalhes tecnicos

### Arquivo modificado

**`src/components/LeadDetailsModal.tsx`** (linhas 249-276)

Adicionar um estado `showOrigens` (useState boolean) e alterar o bloco de origens:

- Quando `hasMultiple`:
  - Renderizar um badge/botao clicavel com texto `"{origens.length} canais diferentes"` e icone Layers
  - Ao clicar, toggle do estado `showOrigens`
  - Quando `showOrigens = true`, mostrar os badges individuais abaixo com animacao suave
- Quando origem unica: manter badge simples como esta

### Estilo do badge clicavel

Usar classes explicitas com suporte a dark mode em vez de `bg-primary/10` (que fica invisivel no tema escuro). Aplicar `cursor-pointer` e `hover:` para indicar interatividade.
