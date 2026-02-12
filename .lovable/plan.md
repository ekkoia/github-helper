

# Cards do Kanban - solucao definitiva para mobile

## Problema real

Usar `100vw` em calculos de largura e problematico porque:
- `100vw` inclui a largura da scrollbar do navegador
- Com multiplos containers com `overflow-x-hidden` (Layout tem 2), o calculo fica inconsistente
- O resultado e que os cards ficam mais largos que o espaco disponivel e sao cortados

## Solucao

Abandonar completamente o uso de `100vw` no mobile e usar um valor fixo em porcentagem do viewport que garante margens visiveis.

### Arquivo: `src/pages/Kanban.tsx` (linha 284)

Trocar:
```
min-w-[calc(100vw-4rem)] md:min-w-[320px]
```

Por:
```
min-w-[82vw] md:min-w-[320px]
```

**Por que 82vw?**
- Em um celular de 390px: 82% = ~320px, sobrando ~35px de margem de cada lado
- Em um celular de 360px: 82% = ~295px, sobrando ~32px de cada lado
- Ambos resultam em cards visivelmente centralizados com respiro, identico ao Dashboard
- `vw` sem `calc` e mais previsivel e nao sofre com os problemas de overflow

### Por que funciona desta vez

As tentativas anteriores falharam porque `calc(100vw - Xrem)` nao desconta corretamente o espaco consumido pelos containers pai com `overflow-x-hidden`. Usar `82vw` diretamente e independente da hierarquia de containers - ele simplesmente ocupa 82% da tela, garantindo 9% de margem em cada lado.
