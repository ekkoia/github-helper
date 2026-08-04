# Plano de ajustes em /chat (abordagem minimalista)

## Contexto

O relato do gestor comercial é: quando o assessor Davi Lopes foi atender um lead, a conversa da IA não apareceu. O medo é que ajustes recentes desconfigurem o que hoje funciona.

## Problema real identificado

Para **não-admin**, o hook `useChatMessages` faz duas coisas antes de buscar mensagens:

1. Carrega todos os telefones de leads cujo `responsavel_id` é o usuário logado.
2. Se o telefone da conversa aberta **não estiver** naquela lista, ele **não consulta** o banco e retorna `messages = []` — a tela fica em branco.

Isso acontece hoje em dois cenários:

- **Lead sem responsável definido** (responsavel_id nulo): nenhum assessor comum vê o histórico.
- **Lead atribuído a outro assessor**: o assessor atual não vê o histórico (é o correto em termos de regra, mas a tela dá a impressão de bug por não explicar o que está acontecendo).

## O que NÃO será alterado

- RLS, rodízio, disparo em massa e envio para a Meta.
- Lógica de abertura da janela de 24h.
- Triggers de banco existentes.
- Deduplicação de leads/mensagens.

## O que será alterado (mínimo possível)

### 1. Explicar na tela quando o chat está vazio por falta de permissão

Em `src/components/chat/ChatWindow.tsx`, quando `messages.length === 0` e o usuário não tem acesso (não-admin e lead não atribuído a ele), mostrar um aviso amigável em vez de tela em branco.

Texto sugerido:  
"Este lead não está atribuído a você. Para visualizar o histórico, peça ao administrador para atribuir o lead."

Isso remove a sensação de "bug" e confirma que a restrição é intencional.

### 2. Melhorar a verificação de atribuição no hook `useChatMessages`

Hoje a validação busca `telefone` exatamente da tabela `leads`. Vamos ajustar para usar `telefone_key` da mesma forma que o resto do sistema, evitando que pequenas diferenças de formatação (com/sem 9, com/sem 55) façam o chat ficar vazio para um lead que deveria estar atribuído.

Não muda a regra: se não for admin e não for responsável, continua sem ver as mensagens — só fica mais preciso.

### 3. Logs de diagnóstico no console (não visuais)

Adicionar mensagens de log no `useChatMessages` quando a lista voltar vazia por segurança, para facilitar investigação futura sem alterar a experiência do usuário.

## Resultado esperado

- Davi e os demais assessores não vão mais ver uma tela branca sem explicação.
- Se o chat estiver vazio, será óbvio se é por permissão ou por falta real de mensagens.
- O resto do sistema permanece inalterado.

## Nota técnica

Não será feito nenhum `UPDATE` em massa, `CREATE TRIGGER` novo ou alteração de políticas de RLS. A mudança é 100% no front-end e no filtro de telefone do hook.
