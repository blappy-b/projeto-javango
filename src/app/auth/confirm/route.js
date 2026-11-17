import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

/**
 * Recebe o link do e-mail do Supabase (redefinição de senha), valida o token
 * e cria a sessão do usuário, levando-o para a página de nova senha.
 *
 * Formato esperado (template "Reset Password" do Supabase):
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  // Só permite redirecionar para caminhos internos.
  const nextParam = searchParams.get("next") || "/reset-password";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/reset-password";

  const supabase = await createSupabaseServer();

  let error = null;

  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    error = new Error("Link sem token");
  }

  if (error) {
    console.error("Erro ao validar link de redefinição:", error);
    return NextResponse.redirect(`${origin}/forgot-password?error=link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
