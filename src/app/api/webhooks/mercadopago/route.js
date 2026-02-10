import { NextResponse } from "next/server";
import { mpPayment } from "@/lib/mercadopago";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAYMENT_STATUS_TO_ORDER_STATUS = {
  approved: "approved",
  pending: "pending",
  in_process: "pending",
  in_mediation: "pending",
  rejected: "rejected",
  cancelled: "cancelled",
  refunded: "cancelled",
  charged_back: "cancelled",
};

function extractNotificationPayload(requestUrl, body) {
  const url = new URL(requestUrl);
  const topic =
    url.searchParams.get("topic") ||
    url.searchParams.get("type") ||
    body?.topic ||
    body?.type ||
    body?.action?.split(".")?.[0];

  const idFromQuery = url.searchParams.get("id") || url.searchParams.get("data.id");
  const idFromBody = body?.data?.id || body?.id;

  return {
    topic,
    id: idFromQuery || idFromBody,
  };
}

function getPaymentData(paymentResponse) {
  return paymentResponse?.body ?? paymentResponse;
}

async function rollbackSoldQuantities(incrementsDone) {
  for (const increment of incrementsDone) {
    await supabaseAdmin.rpc("decrement_ticket_sold", {
      batch_id_input: increment.batch_id,
      quantity_input: increment.quantity,
    });
  }
}

export async function POST(request) {
  const incrementsDone = [];

  try {
    const body = await request.json().catch(() => null);
    const { topic, id } = extractNotificationPayload(request.url, body);

    if (topic !== "payment") {
      return NextResponse.json({ status: "ignored" });
    }

    if (!id) {
      console.error("Webhook payment sem id:", { query: request.url, body });
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 });
    }

    const paymentResponse = await mpPayment.get({ id });
    const payment = getPaymentData(paymentResponse);

    const orderId = payment?.external_reference;
    if (!orderId) {
      console.error("Pagamento sem external_reference:", payment?.id);
      return NextResponse.json({ error: "Missing external_reference" }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, event_id, user_id, status, items_snapshot")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Ordem não encontrada:", orderId, orderError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const mappedOrderStatus = PAYMENT_STATUS_TO_ORDER_STATUS[payment?.status] || "pending";

    if (mappedOrderStatus !== "approved") {
      const { error: updateOrderError } = await supabaseAdmin
        .from("orders")
        .update({
          status: mappedOrderStatus,
          mp_payment_id: String(payment?.id ?? id),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateOrderError) {
        console.error("Erro ao atualizar ordem não aprovada:", updateOrderError);
        return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
      }

      return NextResponse.json({ status: "success", order_status: mappedOrderStatus });
    }

    if (order.status === "approved") {
      return NextResponse.json({ status: "already_processed" });
    }

    const items = order.items_snapshot || [];
    const ticketsToInsert = [];

    for (const item of items) {
      const { error: incrementError } = await supabaseAdmin.rpc("increment_ticket_sold", {
        batch_id_input: item.batch_id,
        quantity_input: item.quantity,
      });

      if (incrementError) {
        console.error("Erro ao incrementar sold_quantity:", incrementError);
        throw incrementError;
      }

      incrementsDone.push({ batch_id: item.batch_id, quantity: item.quantity });

      for (let i = 0; i < item.quantity; i++) {
        ticketsToInsert.push({
          order_id: order.id,
          event_id: order.event_id,
          batch_id: item.batch_id,
          user_id: order.user_id,
          status: "valid",
          paid_price_cents: item.unit_price_cents,
          paid_fee_cents: item.fee_cents,
          guest_name: payment?.payer?.email || "Convidado",
        });
      }
    }

    const { error: insertTicketsError } = await supabaseAdmin.from("tickets").insert(ticketsToInsert);

    if (insertTicketsError) {
      console.error("Erro ao inserir ingressos:", insertTicketsError);
      throw insertTicketsError;
    }

    const { error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "approved",
        mp_payment_id: String(payment?.id ?? id),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateOrderError) {
      console.error("Erro ao atualizar ordem aprovada:", updateOrderError);
      throw updateOrderError;
    }

    return NextResponse.json({ status: "success", order_status: "approved" });
  } catch (error) {
    if (incrementsDone.length > 0) {
      await rollbackSoldQuantities(incrementsDone);
    }

    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
