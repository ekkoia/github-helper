

# Corrigir oscilacao entre abas Tabela/Kanban ao trocar de guia do navegador

## Problema

Quando o usuario esta na aba "Kanban" e troca de guia do navegador, ao voltar a aba e redefinida para "Tabela". Isso acontece porque:

1. Ao voltar para a guia, o Supabase renova o token, causando uma re-renderizacao
2. O hook `useUserPreferences` busca as preferencias novamente
3. O `useEffect` na pagina Leads sobrescreve a aba ativa com `preferences.default_view` toda vez que `preferences` muda
4. Como `default_view` e provavelmente "tabela", a aba sempre volta para "tabela"

## Solucao

Modificar o `useEffect` no arquivo `src/pages/Leads.tsx` para aplicar a preferencia apenas na **primeira carga**, usando uma ref para controlar se ja foi aplicada.

**Arquivo: `src/pages/Leads.tsx`**

- Adicionar um `useRef` chamado `hasAppliedPreference` (inicializado como `false`)
- No `useEffect`, verificar se a preferencia ja foi aplicada antes de sobrescrever a aba ativa
- Apos aplicar a primeira vez, marcar como `true` para nao sobrescrever mais

## Detalhes tecnicos

```text
// Logica revisada
const hasAppliedPreference = useRef(false);

useEffect(() => {
  if (!hasAppliedPreference.current && preferences?.default_view) {
    setActiveTab(preferences.default_view);
    hasAppliedPreference.current = true;
  }
}, [preferences]);
```

Isso garante que a preferencia salva e aplicada apenas quando o componente carrega pela primeira vez. Depois disso, a aba selecionada pelo usuario e preservada mesmo durante re-renderizacoes causadas por refresh de token.

## Arquivos a modificar

1. `src/pages/Leads.tsx` - adicionar ref para aplicar preferencia apenas uma vez

