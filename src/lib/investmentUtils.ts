/**
 * Converte o valor salvo para o topo da faixa de investimento correspondente.
 * 
 * | Valor Salvo | Faixa                    | Retorno     |
 * |-------------|--------------------------|-------------|
 * | ≤ R$10.000  | até R$10 mil             | R$ 10.000   |
 * | ≤ R$50.000  | de R$10 mil a R$50 mil   | R$ 50.000   |
 * | ≤ R$100.000 | de R$50 mil a R$100 mil  | R$ 100.000  |
 * | > R$100.000 | acima de R$100 mil       | valor real  |
 */
export const getTopoDaFaixa = (valor: number): number => {
  if (valor <= 10000) return 10000;
  if (valor <= 50000) return 50000;
  if (valor <= 100000) return 100000;
  return valor; // Acima de 100k, mantém o valor real
};
