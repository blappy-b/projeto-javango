import { NextResponse } from "next/server";
import { mpPayment } from "@/lib/mercadopago";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PAYMENT_STATUS_TO_ORDER_STATUS = {
  approved: "approved",
  pending: "pending",       // PIX aguardando pagamento
  in_process: "pending",    // Em processamento
  in_mediation: "pending",  // Em mediação
  rejected: "rejected",
  cancelled: "cancelled",
  refunded: "cancelled",
  charged_back: "cancelled",
};

// Métodos de pagamento que geram status pending válido (como PIX)
const PENDING_VALID_METHODS = ["pix", "bank_transfer", "ticket"];

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

export async function POST(request) {
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
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Ordem não encontrada:", orderId, orderError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const mappedOrderStatus = PAYMENT_STATUS_TO_ORDER_STATUS[payment?.status] || "pending";
    const paymentMethod = payment?.payment_method_id || payment?.payment_type_id;
    const paymentId = String(payment?.id ?? id);

    // Log detalhado para debug de pagamentos PIX
    console.log(`[Webhook] Pagamento ${payment?.id}: status=${payment?.status}, método=${paymentMethod}, order=${orderId}`);

    if (mappedOrderStatus !== "approved") {
      // Para PIX pendente, armazenamos também o método de pagamento
      const updateData = {
        status: mappedOrderStatus,
        mp_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      };

      const { error: updateOrderError } = await supabaseAdmin
        .from("orders")
        .update(updateData)
        .eq("id", order.id)
        .neq("status", "approved");

      if (updateOrderError) {
        console.error("Erro ao atualizar ordem não aprovada:", updateOrderError);
        return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
      }

      // Para PIX pendente, retornamos sucesso com informação adicional
      if (paymentMethod === "pix" && mappedOrderStatus === "pending") {
        console.log(`[Webhook] PIX pendente - aguardando pagamento para order ${orderId}`);
      }

      return NextResponse.json({ 
        status: "success", 
        order_status: mappedOrderStatus,
        payment_method: paymentMethod 
      });
    }

    if (order.status === "approved") {
      return NextResponse.json({ status: "already_processed" });
    }

    // Processamento aprovado com idempotência forte no banco (transação + lock FOR UPDATE).
    const { data: processResult, error: processError } = await supabaseAdmin.rpc(
      "process_approved_order_payment",
      {
        p_order_id: order.id,
        p_payment_id: paymentId,
        p_guest_name: payment?.payer?.email || "Convidado",
      }
    );

    if (processError) {
      console.error("Erro no processamento idempotente da ordem:", processError);
      throw processError;
    }

    return NextResponse.json({
      status: "success",
      order_status: "approved",
      process_result: processResult || "processed",
    });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
