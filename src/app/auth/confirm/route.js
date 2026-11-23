import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// Recebe o link enviado por e-mail (ex.: redefinição de senha), valida o token
// no Supabase, grava a sessão nos cookies e redireciona para `next`.
//
// Aceita os dois formatos de link:
//  - ?token_hash=...&type=recovery  -> template de e-mail customizado
//                                      (funciona mesmo abrindo o link em outro aparelho)
//  - ?code=...                      -> template padrão do Supabase ({{ .ConfirmationURL }}),
//                                      fluxo PKCE: só funciona no mesmo navegador que pediu o link
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')
  const next = sanitizeNext(searchParams.get('next'))

  const supabase = await createSupabaseServer()
  let error = null

  if (tokenHash && type) {
    ;({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }))
  } else if (code) {
    ;({ error } = await supabase.auth.exchangeCodeForSession(code))
  } else {
    error = new Error('Link sem token')
  }

  if (error) {
    console.error('[auth/confirm]', error.message)
    // A página de destino detecta a ausência de sessão e mostra "link inválido".
  }

  return NextResponse.redirect(new URL(next, origin))
}

// Evita open redirect: só permite caminhos internos.
function sanitizeNext(next) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/redefinir-senha'
  }
  return next
}
