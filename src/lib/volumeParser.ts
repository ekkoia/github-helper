/**
 * Faz o parse de uma string de volume para número
 * Suporta formatos como: "10 mil sacas", "10.000", "10000", etc.
 */
export const parseVolume = (volumeStr: string | null | undefined): number => {
  if (!volumeStr) return 0;
  
  const str = volumeStr.toLowerCase().trim();
  
  // Verifica se contém "mil" ou "k"
  if (str.includes("mil") || str.includes("k")) {
    // Remove tudo exceto números, pontos e vírgulas
    const numPart = str.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(numPart) || 0;
    return num * 1000;
  }
  
  // Verifica se contém "milhão" ou "milhões" ou "mi"
  if (str.includes("milhão") || str.includes("milhões") || str.includes("mi")) {
    const numPart = str.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(numPart) || 0;
    return num * 1000000;
  }
  
  // Remove separadores de milhar (ponto) e trata vírgula como decimal
  // Formato brasileiro: 10.000,50 -> 10000.50
  let cleaned = str.replace(/[^\d.,]/g, "");
  
  // Se tem ponto e vírgula, ponto é milhar e vírgula é decimal
  if (cleaned.includes(".") && cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } 
  // Se só tem vírgula, é decimal
  else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  // Se só tem ponto, verificar se é decimal ou milhar
  else if (cleaned.includes(".")) {
    // Se tem mais de um ponto, são milhares
    const dots = cleaned.split(".").length - 1;
    if (dots > 1) {
      cleaned = cleaned.replace(/\./g, "");
    }
    // Se tem um ponto e 3 dígitos depois, é milhar
    else if (/\.\d{3}$/.test(cleaned)) {
      cleaned = cleaned.replace(".", "");
    }
    // Caso contrário, é decimal
  }
  
  return parseFloat(cleaned) || 0;
};
