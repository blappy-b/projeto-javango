import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// --- 1. CLIENTE PARA O FRONTEND (React Components) ---
// Use este em qualquer componente que tenha 'use client'
// Ele usa a chave ANÔNIMA e respeita as regras de segurança (RLS)
export const createSupabaseBrowser = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// --- 2. CLIENTE PARA ADMINISTRAÇÃO (API Routes / Backend) ---
// ATENÇÃO: Use APENAS em arquivos dentro de /app/api ou Server Actions
// NUNCA importe isso em um componente do Frontend.
// Ele usa a chave SERVICE_ROLE e pode ler/editar TUDO.
export const getSupabaseAdmin = () => {
  // Verificação de segurança para garantir que não estamos no browser
  if (typeof window !== 'undefined') {
    throw new Error('PERIGO: Tentativa de usar Supabase Admin no navegador!')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false, // Não precisamos de sessão para scripts de admin
      },
    }
  )
}