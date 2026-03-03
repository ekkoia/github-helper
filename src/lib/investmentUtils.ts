/**
 * Converte o valor salvo para o topo da faixa de investimento correspondente.
 * 
 * | Valor Salvo  | Faixa                     | Retorno     |
 * |--------------|---------------------------|-------------|
 * | ≤ R$10.000   | até R$10 mil              | R$ 10.000   |
 * | ≤ R$50.000   | de R$10 mil a R$50 mil    | R$ 50.000   |
 * | ≤ R$150.000  | de R$50 mil a R$150 mil   | R$ 150.000  |
 * | > R$150.000  | acima de R$150 mil        | valor real  |
 */
export const getTopoDaFaixa = (valor: number): number => {
  if (valor <= 10000) return 10000;
  if (valor <= 50000) return 50000;
  if (valor <= 150000) return 150000;
  return valor; // Acima de 150k, mantém o valor real
};
