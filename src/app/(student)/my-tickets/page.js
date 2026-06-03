import { createSupabaseServer } from "@/lib/supabase-server";
import TicketCard from "@/components/tickets/TicketCard";
import RefreshButton from "@/components/tickets/RefreshButton";
import LogoutButton from "@/components/tickets/LogoutButton";
import { Ticket, Clock, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

// Evita cache para garantir que se o status mudar (usado), atualize na hora
export const dynamic = 'force-dynamic';

export default async function MyTicketsPage({ searchParams }) {
  const supabase = await createSupabaseServer();
  
  // 1. Verifica autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. Busca Ingressos com Join no Evento e no Lote (apenas eventos futuros)
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(`
      *,
      events!inner (
        title,
        start_date,
        location,
        status
      ),
      ticket_batches (
        name
      )
    `)
    .eq("user_id", user.id)
    .gte("events.start_date", new Date().toISOString())
    .order("purchased_at", { ascending: false });

  // 3. Busca Ordens Pendentes (PIX aguardando pagamento)
  const { data: allPendingOrders } = await supabase
    .from("orders")
    .select(`
      *,
      events (
        title,
        start_date
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Filtra apenas ordens criadas nos últimos 5 minutos (não expiradas)
  const EXPIRATION_MINUTES = 5;
  const pendingOrders = allPendingOrders?.filter((order) => {
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return diffMinutes < EXPIRATION_MINUTES;
  });

  // DEBUG: Log para investigar
  if (error) {
    console.error("Erro ao buscar tickets:", error);
  }
  console.log("User ID:", user.id);
  console.log("Tickets encontrados:", tickets?.length ?? 0);
  console.log("Tickets:", JSON.stringify(tickets, null, 2));

  // Mensagem de sucesso vinda do redirecionamento do MP
  const showSuccessMessage = searchParams?.status === 'success';
  const showPendingMessage = searchParams?.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-primary hover:bg-red-600 rounded-lg transition"
          >
            <ShoppingBag size={16} />
            Comprar Ingressos
          </Link>
          <LogoutButton />
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Ticket className="text-red-primary" size={32} />
            Meus Ingressos
          </h1>
          <p className="text-gray-500 mt-2">
            Apresente o QR Code na entrada do evento.
          </p>
        </div>

        {/* Feedback de Compra */}
        {showSuccessMessage && (
          <div className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <div className="bg-green-200 p-2 rounded-full">🎉</div>
            <div>
              <p className="font-bold">Pagamento Aprovado!</p>
              <p className="text-sm">Seus ingressos já estão disponíveis abaixo.</p>
            </div>
          </div>
        )}

        {showPendingMessage && (
          <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-center gap-3">
            <div className="bg-yellow-200 p-2 rounded-full">⏳</div>
            <div>
              <p className="font-bold">Aguardando Pagamento PIX</p>
              <p className="text-sm">
                Se você pagou via PIX, aguarde alguns segundos e atualize a página. 
                Os ingressos aparecerão assim que o pagamento for confirmado.
              </p>
            </div>
          </div>
        )}

        {/* Ordens Pendentes (PIX aguardando) */}
        {pendingOrders?.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <Clock className="text-yellow-600" size={20} />
              Pagamentos Pendentes
            </h2>
            {pendingOrders.map((order) => (
              <div 
                key={order.id} 
                className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {order.events?.title || "Evento"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Aguardando confirmação do pagamento PIX
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Pedido: {order.id.substring(0, 8)}... • {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-700">
                    R$ {(order.total_amount_cents / 100).toFixed(2).replace('.', ',')}
                  </span>
                  <RefreshButton />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista de Ingressos */}
        <div className="space-y-6">
          {tickets?.length > 0 ? (
            tickets.map((ticket) => (
              <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                event={ticket.events} 
              />
            ))
          ) : (
            // Estado Vazio
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 border-dashed">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ticket className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Nenhum ingresso encontrado</h3>
              <p className="text-gray-500 mb-6">Você ainda não comprou ingressos para nenhum evento.</p>
              <Link 
                href="/" 
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-primary hover:bg-red-primary transition"
              >
                Ver Eventos Disponíveis
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}