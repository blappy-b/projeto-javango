import { NextResponse } from "next/server";
import { mpPayment } from "@/lib/mercadopago";
import { createClient } from "@supabase/supabase-js";

// Usamos o 'createClient' puro aqui pois estamos num contexto de API (Service Role)
// Precisamos da chave SERVICE_ROLE para escrever no banco sem ter sessão de usuário logado
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // 1. Identificar o tipo de notificação
    const url = new URL(request.url);
    const topic = url.searchParams.get("topic") || url.searchParams.get("type");
    const id = url.searchParams.get("id") || url.searchParams.get("data.id");

    if (topic !== "payment") {
      return NextResponse.json({ status: "ignored" });
    }

    // 2. Consultar o Mercado Pago para confirmar o status (Segurança)
    // Nunca confie apenas no payload do body, busque a fonte da verdade.
    const payment = await mpPayment.get({ id });

    if (payment.status === "approved") {
      const orderId = payment.external_reference;
      
      // 3. Buscar a ordem no nosso banco
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        console.error("Ordem não encontrada:", orderId);
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Evita processar a mesma ordem duas vezes
      if (order.status === "approved") {
        return NextResponse.json({ status: "already_processed" });
      }

      // 4. TRANSFORMAR ORDEM EM INGRESSOS (A Lógica de Venda)
      const items = order.items_snapshot; // JSONB
      const ticketsToInsert = [];
      
      for (const item of items) {
        // Incrementa estoque do lote (RPC ou Update direto)
        await supabaseAdmin.rpc('increment_ticket_sold', { 
          batch_id_input: item.batch_id,
          quantity_input: item.quantity 
        });

        // Prepara os tickets
        for (let i = 0; i < item.quantity; i++) {
          ticketsToInsert.push({
            event_id: order.event_id,
            batch_id: item.batch_id,
            user_id: order.user_id,
            status: "valid",
            paid_price_cents: item.unit_price_cents,
            paid_fee_cents: item.fee_cents,
            guest_name: payment.payer?.email || "Convidado"
          });
        }
      }

      // Insere Tickets
      await supabaseAdmin.from("tickets").insert(ticketsToInsert);

      // Atualiza Ordem
      await supabaseAdmin
        .from("orders")
        .update({ 
          status: "approved", 
          updated_at: new Date().toISOString() 
        })
        .eq("id", orderId);
    }

    return NextResponse.json({ status: "success" });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}