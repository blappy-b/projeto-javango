'use client'
import Link from 'next/link'
import { Music, User, LogOut } from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    setUser(null)
  }

  // Se estiver na rota de admin, talvez queira esconder essa navbar, 
  // mas por simplicidade vamos manter.
  
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-red-primary font-bold text-xl">
              <Music className="h-8 w-8" />
              <span>Javango Jango - Eventos</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/my-tickets" className="text-sm font-medium text-gray-700 hover:text-red-primary">
                  Meus Ingressos
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-primary">
                  <LogOut size={16} /> Sair
                </button>
              </>
            ) : (
              <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-red-primary hover:text-red-primary">
                <User size={18} /> Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}