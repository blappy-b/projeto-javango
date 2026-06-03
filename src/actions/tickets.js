"use server";

import { calculateFinalPrice } from "@/utils/price";
import { mpPreference } from "@/lib/mercadopago";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function buyTicketsBulkAction(eventId, cartItems) {
  const supabase = await createSupabaseServer();
  // --- CORREÇÃO DE SEGURANÇA ---
  // Usamos getUser() para validar o token no servidor do Supabase
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthenticated" };
  }

  try {
    // Expira pedidos pendentes com mais de 5 minutos
    await supabase.rpc("expire_stale_pending_orders", { p_minutes: 5 });

    const orderItems = [];
    let totalOrderCents = 0;
    const mpItems = [];

    // 1. Validar Estoque e Preparar Dados
    for (const item of cartItems) {
      const { batchId, quantity } = item;

      const { data: batch } = await supabase
        .from("ticket_batches")
        .select("*")
        .eq("id", batchId)
        .single();

      if (!batch) throw new Error("Lote inválido");

      // Valida se o lote expirou
      if (batch.end_date && new Date(batch.end_date) < new Date()) {
        throw new Error(`O lote "${batch.name}" não está mais disponível para venda`);
      }

      if (batch.total_quantity - batch.sold_quantity < quantity) {
        throw new Error(`Estoque insuficiente para ${batch.name}`);
      }

      const pricing = calculateFinalPrice(batch);

      orderItems.push({
        batch_id: batchId,
        quantity: quantity,
        unit_price_cents: batch.price_cents,

        // AGORA USAMOS totalFee (que inclui a taxa do MP)
        fee_cents: pricing.totalFee,

        name: batch.name,
      });

      // O resto continua igual, pois pricing.total já está corrigido
      totalOrderCents += pricing.total * quantity;

      mpItems.push({
        id: batchId,
        title: `${batch.name}`,
        quantity: quantity,
        unit_price: pricing.total / 100,
        currency_id: "BRL",
      });
    }

    // 2. Criar a Ordem no Supabase
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id, // Agora usamos o user validado
        event_id: eventId,
        status: "pending",
        total_amount_cents: totalOrderCents,
        // O ERRO ESTAVA AQUI (O banco não tinha essa coluna):
        items_snapshot: orderItems,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Erro ao criar ordem no banco:", orderError);
      throw new Error("Erro interno ao iniciar pedido.");
    }

    // 3. Criar a Preference no Mercado Pago
    const preferenceData = {
      items: mpItems,
      payer: {
        email: user.email, // Email validado
      },
      external_reference: order.id,
      auto_return: "approved",
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/my-tickets?status=success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/events/${eventId}?status=failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/my-tickets?status=pending`,
      },
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`,
      // Expiração da preferência (24 horas para dar tempo do PIX)
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      // Descrição que aparece no extrato
      statement_descriptor: "JAVANGO",
    };

    const preference = await mpPreference.create({ body: preferenceData });

    // Log para debug - verificar métodos de pagamento disponíveis
    console.log("Preference criada:", {
      id: preference.id,
      init_point: preference.init_point,
      payment_methods: preference.payment_methods,
    });

    return {
      success: true,
      redirectUrl: preference.init_point,
    };
  } catch (error) {
    console.error("Erro checkout:", error);
    return { error: error.message || "Erro ao criar pagamento." };
  }
}
