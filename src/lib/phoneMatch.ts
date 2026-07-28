/**
 * Normaliza telefone apenas para comparação entre leads e mensagens.
 * Não deve ser usado para enviar para a Meta nem para gravar no banco.
 */
export const normalizePhoneForMatch = (raw: string | null | undefined): string => {
  if (!raw) return "";

  let digits = raw.replace(/\D/g, "");

  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits[2] === "9") {
    digits = digits.slice(0, 2) + digits.slice(3);
  }

  return digits.slice(-10);
};