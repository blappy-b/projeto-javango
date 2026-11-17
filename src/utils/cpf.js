// Utilitários de CPF e e-mail usados no fluxo de "Esqueci minha senha".

export const cleanCpf = (value = "") => String(value).replace(/\D/g, "");

export const formatCpf = (value = "") =>
  cleanCpf(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const isValidCpf = (value) => {
  const cpf = cleanCpf(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const digit = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
};

/**
 * Esconde parte do e-mail para mostrar ao usuário onde o link foi enviado
 * sem expor o endereço completo. Ex.: "maria.silva@gmail.com" → "ma*******@gmail.com"
 */
export const maskEmail = (email = "") => {
  const [user, domain] = String(email).split("@");
  if (!user || !domain) return "";
  const visible = user.length <= 2 ? user.slice(0, 1) : user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(user.length - visible.length, 3))}@${domain}`;
};
