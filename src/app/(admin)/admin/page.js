import { createSupabaseServer } from '@/lib/supabase-server'
import { DollarSign, Users, Calendar, Percent } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Taxa do Mercado Pago (mesmo valor usado em price.js)
const MP_RATE_PERCENT = 4.9

// Calcula a taxa do MP (4,9% do total cobrado)
function calculateFeeSplit(paidPriceCents, paidFeeCents) {
  const basePrice = Number(paidPriceCents) || 0
  const totalFee = Number(paidFeeCents) || 0
  const totalCharged = basePrice + totalFee
  
  const mpFee = Math.round(totalCharged * MP_RATE_PERCENT / 100)
  const serviceFee = Math.max(0, totalFee - mpFee)
  
  return { serviceFee, mpFee }
}

export default async function AdminDashboard() {
  const supabase = await createSupabaseServer()

  // Busca tickets pagos (valid = pago, used = já utilizado)
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select(`
      id,
      paid_price_cents,
      paid_fee_cents,
      status,
      purchased_at,
      event_id,
      batch_id
    `)
    .in('status', ['valid', 'used'])

  // Busca todos os eventos
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, status, start_date, end_date')
    .order('start_date', { ascending: false })

  // Processa tickets para calcular taxas separadas
  const processedTickets = (tickets || []).map(ticket => {
    const paidPrice = Number(ticket.paid_price_cents) || 0
    const paidFee = Number(ticket.paid_fee_cents) || 0
    const totalCharged = paidPrice + paidFee
    
    const { serviceFee, mpFee } = calculateFeeSplit(paidPrice, paidFee)
    
    return {
      ...ticket,
      serviceFee,
      mpFee,
      netReceived: totalCharged - mpFee,
    }
  })

  // Calcula estatísticas
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Função para calcular totais
  const calcTotals = (ticketList) => ({
    count: ticketList.length,
    netReceived: ticketList.reduce((acc, t) => acc + t.netReceived, 0),
    serviceFee: ticketList.reduce((acc, t) => acc + t.serviceFee, 0),
  })

  // Vendas de hoje
  const todayTickets = processedTickets.filter(t => new Date(t.purchased_at) >= todayStart)
  const todayTotals = calcTotals(todayTickets)

  // Vendas do mês
  const monthTickets = processedTickets.filter(t => new Date(t.purchased_at) >= monthStart)
  const monthTotals = calcTotals(monthTickets)

  // Totais gerais
  const totalTotals = calcTotals(processedTickets)

  // Eventos futuros
  const upcomingEvents = (events || []).filter(e => new Date(e.end_date) >= now && e.status === 'published')

  // Formatar moeda
  const formatCurrency = (cents) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">Visão Geral</h1>
      
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {/* Recebido Hoje */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-gray-500 text-sm font-medium">Recebido Hoje</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(todayTotals.netReceived)}</p>
          <p className="text-xs text-gray-400 mt-1">{todayTotals.count} ingresso(s)</p>
        </div>

        {/* Recebido no Mês */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Percent className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-gray-500 text-sm font-medium">Recebido no Mês</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(monthTotals.netReceived)}</p>
          <p className="text-xs text-purple-500 mt-1">
            +{formatCurrency(monthTotals.serviceFee)} taxa de serviço
          </p>
        </div>

        {/* Total de Ingressos */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-gray-500 text-sm font-medium">Total de Ingressos</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{totalTotals.count}</p>
          <p className="text-xs text-gray-400 mt-1">Total recebido: {formatCurrency(totalTotals.netReceived)}</p>
        </div>

        {/* Próximos Eventos */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-gray-500 text-sm font-medium">Próximos Eventos</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{upcomingEvents.length}</p>
          <p className="text-xs text-gray-400 mt-1">Evento(s) publicado(s)</p>
        </div>
      </div>

      {/* Lista de próximos eventos */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Próximos Eventos</h2>
          <div className="space-y-3">
            {upcomingEvents.slice(0, 5).map(event => {
              const eventTickets = processedTickets.filter(t => t.event_id === event.id)
              const eventReceived = eventTickets.reduce((acc, t) => acc + t.netReceived, 0)
              const eventServiceFee = eventTickets.reduce((acc, t) => acc + t.serviceFee, 0)
              
              return (
                <div key={event.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(event.start_date).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(eventReceived)}</p>
                    <p className="text-xs text-purple-500">
                      +{formatCurrency(eventServiceFee)} serviço
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}