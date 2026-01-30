
# Corrigir Taxa de Resposta IA no Dashboard

## Problema Identificado

O card "Taxa de Resposta IA" está mostrando 0% porque o código está comparando com nomes de etapas que não existem no sistema.

**Etapas usadas no código (incorretas):**
- "Em atendimento IA"
- "Atendimento Humano"
- "Reunião Agendada"
- "Proposta Enviada"
- "Ganho"

**Etapas reais no banco de dados:**
1. Novo Lead
2. Atendimento IA
3. Qualificação
4. Não qualificado
5. Follow-up
6. Aceito
7. Não aceito
8. Sem interesse
9. Ghost
10. Em aberto
11. Parceiro

## Lógica da Métrica

A "Taxa de Resposta IA" mede a porcentagem de leads que foram processados pelo Clóvis (IA) - ou seja, leads que avançaram além da etapa "Novo Lead".

**Fórmula:**
```
Taxa = (Leads que saíram de "Novo Lead") / (Total de Leads) × 100
```

Um lead é considerado "processado pela IA" se está em qualquer etapa EXCETO "Novo Lead".

## Dados Atuais

| Etapa | Quantidade |
|-------|------------|
| Novo Lead | 148 |
| Qualificação | 9 |
| Atendimento IA | 4 |
| Não qualificado | 1 |

**Total:** 162 leads
**Processados pela IA:** 14 leads (9 + 4 + 1)
**Taxa esperada:** 8.6%

## Alteração no Código

### Arquivo: `src/components/DashboardMetrics.tsx`

Atualizar o cálculo de `taxaRespostaIA` para usar a lógica correta:

**Código atual (incorreto):**
```typescript
const taxaRespostaIA = useMemo(() => {
  const totalLeads = leads.length;
  if (totalLeads === 0) return 0;
  
  const leadsIA = leads.filter(lead => 
    lead.etapa_funil === "Em atendimento IA" || 
    lead.etapa_funil === "Atendimento Humano" ||
    lead.etapa_funil === "Reunião Agendada" ||
    lead.etapa_funil === "Proposta Enviada" ||
    lead.etapa_funil === "Ganho"
  ).length;
  
  return (leadsIA / totalLeads) * 100;
}, [leads]);
```

**Código corrigido:**
```typescript
const taxaRespostaIA = useMemo(() => {
  const totalLeads = leads.length;
  if (totalLeads === 0) return 0;
  
  // Leads processados pela IA = todos que saíram de "Novo Lead"
  const leadsProcessadosIA = leads.filter(lead => 
    lead.etapa_funil && lead.etapa_funil !== "Novo Lead"
  ).length;
  
  return (leadsProcessadosIA / totalLeads) * 100;
}, [leads]);
```

## Resultado Esperado

Após a correção, o card "Taxa de Resposta IA" mostrará:
- **Valor:** 8.6% (baseado nos dados atuais)
- **Subtítulo:** "Leads processados pelo Clóvis"

O card será atualizado automaticamente conforme mais leads forem processados pela IA.
