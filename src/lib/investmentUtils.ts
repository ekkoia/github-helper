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
 * Retorna o PISO (mínimo) da faixa de investimento em que o valor bruto se encaixa.
 * Baseado nas faixas gravadas pelo webhook (até 10k / 10-50k / 50-100k / acima 100k).
 */
export const getPisoDaFaixa = (valor: number): number => {
  if (valor <= 10000)  return 0;
  if (valor <= 50000)  return 10000;
  if (valor <= 100000) return 50000;
  return 100000;
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
