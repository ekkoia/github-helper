/**
 * Converte o valor salvo para o topo da faixa de investimento correspondente.
 * Faixas vigentes (mínimo R$100):
 *
 * | Valor Real    | Faixa         | Topo usado  |
 * |---------------|---------------|-------------|
 * | ≤ R$500       | ate_500       | R$ 500      |
 * | ≤ R$5.000     | 500_5k        | R$ 5.000    |
 * | ≤ R$20.000    | 5k_20k        | R$ 20.000   |
 * | > R$20.000    | acima_20k     | R$ 50.000 (estimativa conservadora) |
 */
export const getTopoDaFaixa = (valor: number): number => {
  if (valor <= 500)   return 500;
  if (valor <= 5000)  return 5000;
  if (valor <= 20000) return 20000;
  return 50000; // estimativa conservadora para "acima de R$20 mil"
};

/**
 * Retorna o valor exibido como "Pretensão" para o lead.
 * Prioriza o texto "Valor pretendido:" em observacoes (para desambiguar entre
 * escalas Arvora Nativo e Meta), com fallback pelo valor_produto.
 *
 * Regra p/ faixas "até X": exibe o próprio X (não zera).
 * Regra p/ faixas "de X a Y": exibe X (piso).
 */
const parsePretensaoFromObservacoes = (obs: string | null | undefined): number | null => {
  if (!obs) return null;
  const match = obs.match(/Valor pretendido:\s*([^\n\r]+)/i);
  if (!match) return null;
  const raw = match[1].toLowerCase().replace(/\s+/g, ' ').trim();
  if (raw.includes('até r$ 1 mil') || raw.includes('ate r$ 1 mil')) return 1000;
  if (raw.includes('r$1 mil a r$5 mil') || raw.includes('r$ 1 mil a r$ 5 mil')) return 1000;
  if (raw.includes('r$5 mil a r$10 mil') || raw.includes('r$ 5 mil a r$ 10 mil')) return 5000;
  if (raw.includes('até r$10 mil') || raw.includes('ate r$10 mil') || raw.includes('até r$ 10 mil') || raw.includes('ate r$ 10 mil')) return 10000;
  if (raw.includes('r$10 mil a r$50 mil') || raw.includes('r$ 10 mil a r$ 50 mil')) return 10000;
  if (raw.includes('r$50 mil a r$100 mil') || raw.includes('r$ 50 mil a r$ 100 mil')) return 50000;
  if (raw.includes('acima de r$100 mil') || raw.includes('acima de r$ 100 mil')) return 100000;
  return null;
};

const pisoFromValorProduto = (valor: number | null | undefined): number => {
  if (!valor || valor <= 0) return 0;
  if (valor <= 1000)   return 1000;   // Arvora "até R$1 mil" → teto
  if (valor <= 5000)   return 1000;   // Arvora "R$1-5 mil" → piso
  if (valor <= 10000)  return 10000;  // assume Meta "até R$10 mil" → teto
  if (valor <= 50000)  return 10000;  // R$10-50 mil → piso
  if (valor <= 100000) return 50000;  // R$50-100 mil → piso
  return 100000;                      // acima R$100 mil → piso
};

export const getPisoDaFaixa = (leadOrValor: any): number => {
  // Compat: se receber número, aplica só o mapa por valor_produto
  if (typeof leadOrValor === 'number' || typeof leadOrValor === 'string') {
    return pisoFromValorProduto(Number(leadOrValor));
  }
  if (!leadOrValor) return 0;
  const fromText = parsePretensaoFromObservacoes(leadOrValor.observacoes);
  if (fromText !== null) return fromText;
  return pisoFromValorProduto(Number(leadOrValor.valor_produto));
};

/**
 * Retorna o valor estimado (ponto médio conservador) de um lead
 * com base em faixa_investimento ou investimento_real.
 */
export const FAIXA_VALOR: Record<string, number> = {
  ate_500:   300,
  "500_5k":  2750,
  "5k_20k":  12500,
  acima_20k: 30000,
};

export const getValorEstimadoLead = (lead: any): number => {
  if (lead.investimento_real && Number(lead.investimento_real) > 0) {
    return Number(lead.investimento_real);
  }
  if (lead.faixa_investimento && FAIXA_VALOR[lead.faixa_investimento]) {
    return FAIXA_VALOR[lead.faixa_investimento];
  }
  return 0;
};
