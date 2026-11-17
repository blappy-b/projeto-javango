"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { cleanCpf, isValidCpf, maskEmail } from "@/utils/cpf";

/**
 * "Esqueci minha senha": recebe o CPF, encontra a conta vinculada e pede ao
 * Supabase Auth para enviar o e-mail de redefinição de senha (serviço gratuito
 * do próprio Supabase, sem custo extra).
 *
 * O link do e-mail aponta para /auth/confirm, que valida o token e leva o
 * usuário para /reset-password (ver docs/PASSWORD_RESET.md).
 */
export async function requestPasswordResetAction(cpfInput) {
  const cpf = cleanCpf(cpfInput);

  if (!isValidCpf(cpf)) {
    return { error: "CPF inválido." };
  }

  const notFound = {
    error: "Não encontramos uma conta com este CPF. Confira o número ou crie uma conta.",
  };

  try {
    const supabase = getSupabaseAdmin();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("cpf", cpf)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return notFound;

    // Busca o e-mail direto no Auth (fonte da verdade do login).
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(profile.id);

    if (userError) throw userError;

    const email = userData?.user?.email;
    if (!email) return notFound;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/reset-password`,
    });

    if (resetError) {
      // 429 = limite de envio do Supabase (ex.: pedidos repetidos em sequência)
      if (resetError.status === 429) {
        return {
          error: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
        };
      }
      throw resetError;
    }

    return { success: true, maskedEmail: maskEmail(email) };
  } catch (error) {
    console.error("Erro ao solicitar redefinição de senha:", error);
    return { error: "Não foi possível enviar o e-mail agora. Tente novamente em instantes." };
  }
}
