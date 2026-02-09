import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Plus, Calendar, DollarSign, Users, MoreHorizontal } from 'lucide-react'
import EventActions from '@/components/admin/EventActions'

// Força a página a ser dinâmica (sem cache estático), pois os dados mudam
export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  const supabase = await createSupabaseServer()

  // 1. Busca eventos e faz o Join com os Lotes para saber as vendas
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      ticket_batches (
        sold_quantity,
        total_quantity,
        price_cents
      )
    `)
    .order('start_date', { ascending: false })

  if (error) {
    return <div className="p-8 text-red-primary">Erro ao carregar eventos: {error.message}</div>
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-gray">Eventos</h1>
          <p className="text-gray-500">Gerencie seus shows e recitais</p>
        </div>
        <Link 
          href="/admin/events/new" 
          className="bg-red-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition"
        >
          <Plus size={20} />
          Novo Evento
        </Link>
      </div>

      {/* Tabela de Eventos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500">
              <tr>
                <th className="px-6 py-4">Evento</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Vendas (Ingressos)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events?.map((event) => {
                // Lógica de Soma dos Lotes no Frontend (Server Side Rendered)
                const totalSold = event.ticket_batches.reduce((acc, batch) => acc + batch.sold_quantity, 0)
                const totalCapacity = event.ticket_batches.reduce((acc, batch) => acc + batch.total_quantity, 0)
                
                // Cálculo de Receita Estimada (Bruta)
                const revenueCents = event.ticket_batches.reduce((acc, batch) => acc + (batch.sold_quantity * batch.price_cents), 0)

                return (
                  <tr key={event.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-dark-gray">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-xl">
                          {event.image_url ? '📷' : '🎵'}
                        </div>
                        {event.title}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span>{new Date(event.start_date).toLocaleDateString()}</span>
                        <span className="text-xs text-gray-400">{new Date(event.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          <span className="font-bold">{totalSold}</span> / {totalCapacity}
                        </div>
                        <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <DollarSign size={10} />
                          {(revenueCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={event.status} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <EventActions eventId={event.id} isPastEvent={new Date(event.end_date) < new Date()} />
                    </td>
                  </tr>
                )
              })}

              {events?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Nenhum evento encontrado. Crie o primeiro!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Pequeno componente visual local
function StatusBadge({ status }) {
  const styles = {
    published: "bg-green-100 text-green-700 border-green-200",
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    ended: "bg-red-primary text-red-primary border-red-primary",
    cancelled: "bg-red-primary text-red-primary border-red-primary",
  }

  const labels = {
    published: "Publicado",
    draft: "Rascunho",
    ended: "Encerrado",
    cancelled: "Cancelado",
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  )
}