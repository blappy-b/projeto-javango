import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
  // 1. Inicializa a resposta (para podermos manipular headers/cookies)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Cria o cliente Supabase no contexto do Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 3. Verifica se existe usuário logado
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // --- REGRA 1: Rotas Públicas (Login, Cadastro, Webhooks, Assets) ---
  // Se não fizermos isso, o loop de redirecionamento pode quebrar o site
  if (
    path === '/' ||
    path.startsWith('/events') ||
    path.startsWith('/login') || 
    path.startsWith('/register') || 
    path.startsWith('/api/webhooks') ||
    path.startsWith('/api/health') || // Health check para manter Supabase ativo
    path.startsWith('/_next') || // Arquivos internos do Next
    path.includes('.') // Arquivos estáticos (imagens, css)
  ) {
    return response
  }

  // --- REGRA 2: Se não estiver logado, manda pro Login ---
  // Protege tudo que não é público
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // --- REGRA 3: Controle de Acesso por Função (RBAC) ---
  // Aqui buscamos o "role" na tabela profiles que criamos no SQL
  
  // Nota: Em produção de alta escala, o ideal é ter o 'role' nos metadados do usuário
  // para evitar bater no banco toda vez. Para o MVP, bater no banco é mais seguro e simples.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'customer'

  // A. Proteção da Área ADMIN
  if (path.startsWith('/admin')) {
    if (userRole !== 'admin') {
      // Se for Staff ou Aluno tentando entrar no Admin -> Manda pra Home
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // B. Proteção da Área STAFF (Scanner)
  if (path.startsWith('/scanner')) {
    // Admin também pode escanear se quiser
    if (userRole !== 'staff' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

// Configuração: Em quais rotas o middleware deve rodar?
export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, EXCETO:
     * - api/webhooks (para o Mercado Pago conseguir notificar)
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico (ícone)
     */
    '/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)',
  ],
}
