## Problema

Na página `/leads` (aba Kanban), as colunas "Leads FDS" e "Lead WhatsApp (não qualificado)" aparecem mais largas que as demais.

## Causa

Em `src/pages/Kanban.tsx` (linha 337), cada coluna usa:

```
className="w-[78vw] md:w-auto md:min-w-[320px] flex-shrink-0 snap-start"
```

No desktop, `md:w-auto` + `md:min-w-[320px]` faz a largura se ajustar ao conteúdo. Como o header do card exibe o nome da etapa em uma única linha (`CardTitle` sem `truncate`), etapas com títulos longos ("Leads FDS" com badge, e principalmente "Lead WhatsApp (não qualificado)") esticam a coluna além dos 320px, enquanto etapas de nome curto ficam no mínimo.

## Correção

Trocar a largura para um valor fixo no desktop, mantendo o comportamento mobile:

- De: `w-[78vw] md:w-auto md:min-w-[320px] flex-shrink-0 snap-start`
- Para: `w-[78vw] md:w-[320px] flex-shrink-0 snap-start`

E garantir que o título não force o crescimento, adicionando `truncate` no `<span>{etapa}</span>` do `CardTitle` (linha 349) e `min-w-0` no `CardTitle` para permitir o truncamento sem afetar o badge de contagem.

## Escopo

Apenas o arquivo `src/pages/Kanban.tsx`, restrito ao container da coluna e ao header. Nenhuma outra lógica (drag/drop, filtros, dados) será alterada.