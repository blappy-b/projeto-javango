import { createSupabaseServer } from '@/lib/supabase-server'
import { DollarSign, Users, Calendar, TrendingUp, TrendingDown, ArrowUpRight, Ticket, Percent } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Taxas do Mercado Pago (mesmo valor usado em price.js)
const MP_RATE_PERCENT = 4.9
const MP_FIXED_CENTS = 0

// Calcula a taxa do MP (apenas percentual, sem taxa fixa)
function calculateFeeSplit(paidPriceCents, paidFeeCents) {
  const basePrice = Number(paidPriceCents) || 0
  const totalFee = Number(paidFeeCents) || 0
  const totalCharged = basePrice + totalFee

  // Taxa do MP = porcentagem sobre o total cobrado (sem taxa fixa, que é por transação)
  const mpFee = Math.round(totalCharged * MP_RATE_PERCENT / 100)
  
  // Taxa de serviço = o que sobra das taxas após o MP
  const serviceFee = Math.max(0, totalFee - mpFee)

  return { serviceFee, mpFee }
}

export default async function AdminSalesPage() {
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
      batch_id,
      events (
        id,
        title,
        start_date,
        end_date,
        status
      )
    `)
    .in('status', ['valid', 'used'])
    .order('purchased_at', { ascending: false })

  if (ticketsError) {
    return (
      <div className="p-8 text-red-600">
        Erro ao carregar dados de vendas: {ticketsError.message}
      </div>
    )
  }

  // Processa cada ticket para separar as taxas
  const processedTickets = (tickets || []).map(ticket => {
    const paidPrice = Number(ticket.paid_price_cents) || 0
    const paidFee = Number(ticket.paid_fee_cents) || 0
    const totalCharged = paidPrice + paidFee
    
    const { serviceFee, mpFee } = calculateFeeSplit(paidPrice, paidFee)

    return {
      ...ticket,
      paid_price_cents: paidPrice,
      paid_fee_cents: paidFee,
      serviceFee,
      mpFee,
      // Valor que você recebe = total cobrado - taxa do MP
      netReceived: totalCharged - mpFee,
    }
  })

  // Calcula estatísticas
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // Função para calcular totais de um grupo de tickets
  const calcTotals = (ticketList) => ({
    count: ticketList.length,
    basePrice: ticketList.reduce((acc, t) => acc + (t.paid_price_cents || 0), 0),
    serviceFee: ticketList.reduce((acc, t) => acc + t.serviceFee, 0),
    mpFee: ticketList.reduce((acc, t) => acc + t.mpFee, 0),
    netReceived: ticketList.reduce((acc, t) => acc + t.netReceived, 0),
    gross: ticketList.reduce((acc, t) => acc + (t.paid_price_cents || 0) + (t.paid_fee_cents || 0), 0),
  })

  // Vendas de hoje
  const todayTickets = processedTickets.filter(t => new Date(t.purchased_at) >= todayStart)
  const todayTotals = calcTotals(todayTickets)

  // Vendas da semana
  const weekTickets = processedTickets.filter(t => new Date(t.purchased_at) >= weekStart)
  const weekTotals = calcTotals(weekTickets)

  // Vendas do mês atual
  const monthTickets = processedTickets.filter(t => new Date(t.purchased_at) >= monthStart)
  const monthTotals = calcTotals(monthTickets)

  // Vendas do mês passado (para comparação)
  const lastMonthTickets = processedTickets.filter(t => {
    const date = new Date(t.purchased_at)
    return date >= lastMonthStart && date <= lastMonthEnd
  })
  const lastMonthTotals = calcTotals(lastMonthTickets)

  // Totais gerais
  const totalTotals = calcTotals(processedTickets)

  // Agrupar vendas por evento
  const salesByEvent = {}
  for (const ticket of processedTickets) {
    const eventId = ticket.event_id
    if (!salesByEvent[eventId]) {
      salesByEvent[eventId] = {
        event: ticket.events,
        ticketCount: 0,
        basePrice: 0,
        serviceFee: 0,
        mpFee: 0,
        netReceived: 0,
        gross: 0,
      }
    }
    salesByEvent[eventId].ticketCount++
    salesByEvent[eventId].basePrice += ticket.paid_price_cents || 0
    salesByEvent[eventId].serviceFee += ticket.serviceFee
    salesByEvent[eventId].mpFee += ticket.mpFee
    salesByEvent[eventId].netReceived += ticket.netReceived
    salesByEvent[eventId].gross += (ticket.paid_price_cents || 0) + (ticket.paid_fee_cents || 0)
  }

  const eventSalesList = Object.values(salesByEvent).sort((a, b) => b.netReceived - a.netReceived)

  // Calcular variação percentual mês a mês
  const monthVariation = lastMonthTotals.netReceived > 0 
    ? ((monthTotals.netReceived - lastMonthTotals.netReceived) / lastMonthTotals.netReceived * 100).toFixed(1)
    : monthTotals.netReceived > 0 ? 100 : 0

  // Formatar moeda
  const formatCurrency = (cents) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-dark-gray">Vendas</h1>
        <p className="text-gray-500 text-sm md:text-base">Acompanhe as vendas e receitas dos eventos</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {/* Recebido Hoje */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">HOJE</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(todayTotals.netReceived)}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{todayTotals.count} ingresso(s)</span>
            {todayTotals.serviceFee > 0 && (
              <span className="text-xs text-purple-500">+{formatCurrency(todayTotals.serviceFee)} serviço</span>
            )}
          </div>
        </div>

        {/* Recebido na Semana */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">ÚLTIMOS 7 DIAS</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(weekTotals.netReceived)}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{weekTotals.count} ingresso(s)</span>
            {weekTotals.serviceFee > 0 && (
              <span className="text-xs text-purple-500">+{formatCurrency(weekTotals.serviceFee)} serviço</span>
            )}
          </div>
        </div>

        {/* Recebido no Mês */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">ESTE MÊS</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(monthTotals.netReceived)}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{monthTotals.count} ingresso(s)</span>
            <span className={`text-xs font-medium flex items-center gap-0.5 ${
              monthVariation >= 0 ? 'text-green-600' : 'text-red-500'
            }`}>
              {monthVariation >= 0 ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />}
              {Math.abs(monthVariation)}%
            </span>
          </div>
        </div>

        {/* Total Geral */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-xs text-gray-400 font-medium">TOTAL</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatCurrency(totalTotals.netReceived)}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{totalTotals.count} ingresso(s)</span>
            {totalTotals.serviceFee > 0 && (
              <span className="text-xs text-purple-500">+{formatCurrency(totalTotals.serviceFee)} serviço</span>
            )}
          </div>
        </div>
      </div>

      {/* Resumo Financeiro Detalhado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-xl text-white">
          <h3 className="text-green-100 text-xs font-medium mb-1">RECEITA LÍQUIDA</h3>
          <p className="text-2xl md:text-3xl font-bold">{formatCurrency(totalTotals.netReceived)}</p>
          <p className="text-green-100 text-xs mt-2">Total cobrado - taxa do MP</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-xl text-white">
          <h3 className="text-purple-100 text-xs font-medium mb-1">TAXA DE SERVIÇO</h3>
          <p className="text-2xl md:text-3xl font-bold">{formatCurrency(totalTotals.serviceFee)}</p>
          <p className="text-purple-100 text-xs mt-2">Inclusa na receita líquida</p>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-5 rounded-xl text-white">
          <h3 className="text-gray-200 text-xs font-medium mb-1">TAXA MERCADO PAGO</h3>
          <p className="text-2xl md:text-3xl font-bold">{formatCurrency(totalTotals.mpFee)}</p>
          <p className="text-gray-200 text-xs mt-2">4,9% do total cobrado</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-xl text-white">
          <h3 className="text-blue-100 text-xs font-medium mb-1">TOTAL COBRADO</h3>
          <p className="text-2xl md:text-3xl font-bold">{formatCurrency(totalTotals.gross)}</p>
          <p className="text-blue-100 text-xs mt-2">Valor pago pelo cliente</p>
        </div>
      </div>

      {/* Explicação do Cálculo */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Como funciona o cálculo?</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <p><strong>Receita Líquida</strong> = Total Cobrado - Taxa MP (4,9%)</p>
          <p><strong>Taxa de Serviço</strong> = Parte da receita que você configurou por lote</p>
        </div>
      </div>

      {/* Vendas por Evento */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Vendas por Evento</h2>
          <p className="text-sm text-gray-500">Detalhamento das receitas de cada evento</p>
        </div>

        {eventSalesList.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nenhuma venda registrada ainda.
          </div>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-4 font-medium">Evento</th>
                    <th className="px-4 py-4 font-medium text-center">Qtd</th>
                    <th className="px-4 py-4 font-medium text-right">Valor Base</th>
                    <th className="px-4 py-4 font-medium text-right">Taxa Serviço</th>
                    <th className="px-4 py-4 font-medium text-right">Taxa MP</th>
                    <th className="px-4 py-4 font-medium text-right">Receita Líquida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {eventSalesList.map((sale) => (
                    <tr key={sale.event?.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-4">
                        <div>
                          <span className="font-medium text-gray-800">{sale.event?.title || 'Evento removido'}</span>
                          <p className="text-xs text-gray-400">
                            {sale.event?.start_date 
                              ? new Date(sale.event.start_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                              : '-'
                            }
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {sale.ticketCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-gray-600">
                        {formatCurrency(sale.basePrice)}
                      </td>
                      <td className="px-4 py-4 text-right text-purple-600">
                        +{formatCurrency(sale.serviceFee)}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-400">
                        -{formatCurrency(sale.mpFee)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-bold text-green-600" title="Valor Base + Taxa Serviço">{formatCurrency(sale.netReceived)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td className="px-4 py-4 text-gray-800">Total</td>
                    <td className="px-4 py-4 text-center text-gray-800">{totalTotals.count}</td>
                    <td className="px-4 py-4 text-right text-gray-800">{formatCurrency(totalTotals.basePrice)}</td>
                    <td className="px-4 py-4 text-right text-purple-600">+{formatCurrency(totalTotals.serviceFee)}</td>
                    <td className="px-4 py-4 text-right text-gray-400">-{formatCurrency(totalTotals.mpFee)}</td>
                    <td className="px-4 py-4 text-right text-green-600 font-bold" title="Valor Base + Taxa Serviço">{formatCurrency(totalTotals.netReceived)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {eventSalesList.map((sale) => (
                <div key={sale.event?.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-800">{sale.event?.title || 'Evento removido'}</h3>
                      <p className="text-sm text-gray-500">
                        {sale.event?.start_date 
                          ? new Date(sale.event.start_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                          : '-'
                        }
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      <Users size={12} />
                      {sale.ticketCount}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-center mb-2">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Valor Base</p>
                      <p className="font-medium text-sm text-gray-700">{formatCurrency(sale.basePrice)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Taxa Serviço</p>
                      <p className="font-medium text-sm text-purple-600">+{formatCurrency(sale.serviceFee)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-gray-100 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Taxa MP</p>
                      <p className="font-medium text-sm text-gray-500">-{formatCurrency(sale.mpFee)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Receita Líquida</p>
                      <p className="font-bold text-sm text-green-600">{formatCurrency(sale.netReceived)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total Mobile */}
              <div className="p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-800">Total Geral</span>
                  <span className="text-sm text-gray-500">{totalTotals.count} ingressos</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center mb-2">
                  <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <p className="text-xs text-gray-500">Valor Base</p>
                    <p className="font-medium text-sm">{formatCurrency(totalTotals.basePrice)}</p>
                  </div>
                  <div className="bg-purple-100 rounded-lg p-2 border border-purple-200">
                    <p className="text-xs text-purple-700">Taxa Serviço</p>
                    <p className="font-medium text-sm text-purple-700">+{formatCurrency(totalTotals.serviceFee)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <p className="text-xs text-gray-500">Taxa MP</p>
                    <p className="font-medium text-sm text-gray-500">-{formatCurrency(totalTotals.mpFee)}</p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-2 border border-green-200">
                    <p className="text-xs text-green-700">Receita Líquida</p>
                    <p className="font-bold text-sm text-green-700">{formatCurrency(totalTotals.netReceived)}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
