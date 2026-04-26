'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, Users, BarChart3, Menu, X } from 'lucide-react'

const MENU_ITEMS = [
  { href: '/admin/events', icon: Calendar, label: 'Eventos' },
  { href: '/admin/staff/assignments', icon: Users, label: 'Atribuir Staffs' },
  { href: '/admin/sales', icon: BarChart3, label: 'Vendas' },
]

export default function AdminLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-dark-gray text-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-lg font-bold tracking-tighter">Admin Panel</h2>
            <p className="text-red-600 font-semibold text-xs">Javango Jango</p>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Sidebar (Slide-in) */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-dark-gray text-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tighter">Admin Panel</h2>
              <p className="text-red-600 font-semibold text-xs mt-1">Javango Jango</p>
            </div>
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="mt-4 px-4 space-y-2">
          {MENU_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={<item.icon size={20} />}
              label={item.label}
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              onClick={closeMobileMenu}
            />
          ))}
        </nav>
      </aside>

      {/* Desktop Sidebar (Fixed) */}
      <aside className="w-56 bg-dark-gray text-white hidden md:block fixed h-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold tracking-tighter">Admin Panel</h2>
          <p className="text-red-600 font-semibold text-xs mt-1">Javango Jango</p>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {MENU_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={<item.icon size={20} />}
              label={item.label}
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 md:ml-56 pt-16 md:pt-0 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}

// Componente auxiliar para links ativos
function NavItem({ href, icon, label, isActive = false, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? 'bg-red-primary text-white'
          : 'text-slate-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}