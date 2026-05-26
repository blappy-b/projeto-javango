import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sales
 * Retorna estatísticas de vendas por evento
 * Query params: 
 *   - event_id: (opcional) filtrar por evento específico
 */
export async function GET(request) {
  try {
    const supabase = await createSupabaseServer();
    
    // Verificar autenticação e permissão de admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("event_id");

    // Query para buscar estatísticas de vendas agrupadas por evento
    // Usando tickets válidos (status != 'refunded')
    let query = supabase
      .from("tickets")
      .select(`
        event_id,
        paid_price_cents,
        paid_fee_cents,
        status,
        events!inner (
          id,
          title,
          start_date,
          end_date,
          status
        )
      `)
      .neq("status", "refunded");

    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    const { data: tickets, error: ticketsError } = await query;

    if (ticketsError) {
      console.error("Erro ao buscar tickets:", ticketsError);
      return NextResponse.json({ error: "Erro ao buscar dados de vendas" }, { status: 500 });
    }

    // Agrupar e calcular estatísticas por evento
    const salesByEvent = {};

    for (const ticket of tickets || []) {
      const eventKey = ticket.event_id;
      
      if (!salesByEvent[eventKey]) {
        salesByEvent[eventKey] = {
          event_id: eventKey,
          event_title: ticket.events.title,
          event_start_date: ticket.events.start_date,
          event_end_date: ticket.events.end_date,
          event_status: ticket.events.status,
          total_tickets_sold: 0,
          total_tickets_used: 0,
          gross_revenue_cents: 0,      // Valor bruto (o que o cliente pagou)
          net_revenue_cents: 0,         // Valor líquido (o que a escola recebe)
          total_fees_cents: 0,          // Total de taxas (vai pro MP)
        };
      }

      salesByEvent[eventKey].total_tickets_sold++;
      
      if (ticket.status === "used") {
        salesByEvent[eventKey].total_tickets_used++;
      }

      const paidPrice = ticket.paid_price_cents || 0;
      const paidFee = ticket.paid_fee_cents || 0;

      salesByEvent[eventKey].gross_revenue_cents += paidPrice + paidFee;
      salesByEvent[eventKey].net_revenue_cents += paidPrice;
      salesByEvent[eventKey].total_fees_cents += paidFee;
    }

    // Converter para array e ordenar por data
    const salesList = Object.values(salesByEvent).sort((a, b) => 
      new Date(b.event_start_date) - new Date(a.event_start_date)
    );

    // Calcular totais gerais
    const totals = {
      total_events: salesList.length,
      total_tickets_sold: salesList.reduce((acc, s) => acc + s.total_tickets_sold, 0),
      total_tickets_used: salesList.reduce((acc, s) => acc + s.total_tickets_used, 0),
      gross_revenue_cents: salesList.reduce((acc, s) => acc + s.gross_revenue_cents, 0),
      net_revenue_cents: salesList.reduce((acc, s) => acc + s.net_revenue_cents, 0),
      total_fees_cents: salesList.reduce((acc, s) => acc + s.total_fees_cents, 0),
    };

    return NextResponse.json({
      success: true,
      sales: salesList,
      totals,
    });
  } catch (error) {
    console.error("Erro no endpoint de vendas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
