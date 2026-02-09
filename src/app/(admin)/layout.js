import Link from 'next/link'
import { LayoutDashboard, Calendar, Ticket, Users, BarChart3 } from 'lucide-react'

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar Fixa */}
      <aside className="w-56 bg-dark-gray text-white hidden md:block fixed h-full">
        <div className="p-6">
          <h2 className="text-2xl font-bold tracking-tighter">Admin Panel</h2>
          <p className="text-red-600 font-semibold text-xs mt-1">Javango Jango</p>
        </div>
        
        <nav className="mt-6 px-4 space-y-2">
          {/* <NavItem href="/admin" icon={<LayoutDashboard size={20} />} label="Visão Geral" /> */}
          <NavItem href="/admin/events" icon={<Calendar size={20} />} label="Eventos" />
          <NavItem href="/admin/sales" icon={<BarChart3 size={20} />} label="Vendas" />
          {/* <NavItem href="/scanner" icon={<Ticket size={20} />} label="Scanner (Staff)" /> */}
        </nav>
      </aside>

      {/* Conteúdo Principal (com margem para não ficar baixo da sidebar) */}
      <main className="flex-1 md:ml-64 p-8">
        {children}
      </main>
    </div>
  )
}

// Componente auxiliar para links ativos
function NavItem({ href, icon, label }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg- hover:text-white rounded-lg transition-colors"
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}