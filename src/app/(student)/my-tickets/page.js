import { createSupabaseServer } from "@/lib/supabase-server";
import TicketCard from "@/components/tickets/TicketCard";
import { Ticket } from "lucide-react";
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

  // 2. Busca Ingressos com Join no Evento e no Lote
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(`
      *,
      events (
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
    .order("purchased_at", { ascending: false });

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
          <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 p-4 rounded-xl">
            <p className="font-bold">Pagamento em Processamento</p>
            <p className="text-sm">Assim que o banco confirmar, seus ingressos aparecerão aqui. Atualize a página em alguns instantes.</p>
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