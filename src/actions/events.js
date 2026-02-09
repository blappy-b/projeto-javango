"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseActionClient } from "@/utils/createSupabaseActionClient";

// Schema de validação
const eventSchema = z.object({
  title: z.string().min(3, "O título precisa ter pelo menos 3 letras"),
  description: z.string().optional(),
  location: z.string().min(3, "Local é obrigatório"),
  start_date: z.string(),
  end_date: z.string(),
  batches: z
    .array(
      z.object({
        name: z.string().min(1, "Nome do lote é obrigatório"),
        price: z.coerce.number().min(0, "O preço não pode ser negativo"),
        quantity: z.coerce.number().min(1, "Quantidade mínima é 1"),
        fee_percent: z.coerce.number().min(0).default(10),
      })
    )
    .min(1, "Crie pelo menos um tipo de ingresso"),
});

const updateEventSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  location: z.string().min(3),
  start_date: z.string(),
  end_date: z.string(),
  batches: z.array(
    z.object({
      dbId: z.string().optional(),
      name: z.string().min(1),
      price: z.coerce.number().min(0),
      quantity: z.coerce.number().min(1),
      fee_percent: z.coerce.number().min(0).default(10),
      quantity_sold: z.coerce.number().optional().default(0),
    })
  ).min(1),
});

export async function createEventAction(prevState, formData) {
  const supabase = await createSupabaseActionClient();

  // 1. Validar Sessão
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Erro ao obter sessão:", sessionError);
    return { error: "Erro ao validar sessão. Tente novamente." };
  }

  if (!session) return { error: "Usuário não autenticado" };

  // 2. Parse dos dados (FormData vem cru)
  let batchesParsed;
  try {
    batchesParsed = JSON.parse(formData.get("batches") || "[]");
  } catch {
    return {
      error: "Dados inválidos",
      details: { batches: ["JSON de batches inválido"] },
    };
  }

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    batches: batchesParsed,
  };

  const validated = eventSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: "Dados inválidos", details: validated.error.flatten() };
  }

  const { batches, ...eventData } = validated.data;

  try {
    // 3. Criar o Evento
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        ...eventData,
        organizer_id: session.user.id,
        status: "published",
      })
      .select()
      .single();

    if (eventError) throw eventError;

    // 4. Preparar os Lotes
    const batchesToInsert = batches.map((batch) => ({
      event_id: event.id,
      name: batch.name,
      price_cents: Math.round(Number(batch.price) * 100),
      total_quantity: Number(batch.quantity),
      service_fee_percent: Number(batch.fee_percent ?? 10),
      min_service_fee_cents: 200,
      is_active: true,
    }));

    // 5. Inserir Lotes
    const { error: batchesError } = await supabase
      .from("ticket_batches")
      .insert(batchesToInsert);

    if (batchesError) throw batchesError;

    revalidatePath("/admin/events");
    return { success: true, eventId: event.id };
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    return { error: "Erro interno ao salvar evento. Tente novamente." };
  }
}

export async function deleteEventAction(eventId) {
  const supabase = await createSupabaseActionClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Não autorizado" };

  const { error } = await supabase.rpc("delete_event_if_no_sales", {
    p_event_id: eventId,
    p_user_id: session.user.id,
  });

  if (error) {
    // mensagens amigáveis
    if (error.message.includes("event has sales")) {
      return { error: "Não é possível deletar: já existem ingressos vendidos." };
    }
    if (error.message.includes("not authorized")) {
      return { error: "Você não tem permissão para deletar este evento." };
    }
    console.error("Erro ao deletar:", error);
    return { error: "Erro ao deletar evento." };
  }

  revalidatePath("/admin/events");
  return { success: true };
}

export async function updateEventAction(eventId, formData) {
  const supabase = await createSupabaseActionClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: "Usuário não autenticado" };

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    batches: JSON.parse(formData.get("batches")),
  };

  const validated = updateEventSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: "Dados inválidos", details: validated.error.flatten() };
  }

  const { batches, ...eventData } = validated.data;

  try {
    // 1. Atualiza evento
    const { data: updated } = await supabase
      .from("events")
      .update(eventData)
      .eq("id", eventId)
      .eq("organizer_id", session.user.id)
      .select("id");

    if (!updated?.length) {
      throw new Error("Evento não encontrado ou sem permissão.");
    }

    // 2. Busca lotes atuais
    const { data: currentBatches } = await supabase
      .from("ticket_batches")
      .select("id, sold_quantity")
      .eq("event_id", eventId);

    if (!currentBatches) {
      throw new Error("Erro ao buscar lotes.");
    }

    const incomingBatchIds = batches.map(b => b.dbId).filter(Boolean);

    // 3. Exclusão segura
    const batchesToDelete = currentBatches.filter(
      db => !incomingBatchIds.includes(db.id)
    );

    for (const batch of batchesToDelete) {
      if (batch.sold_quantity > 0) {
        throw new Error("Não é possível excluir lote com vendas.");
      }

      await supabase
        .from("ticket_batches")
        .delete()
        .eq("id", batch.id)
        .eq("event_id", eventId);
    }

    // 4. Inserção de novos
    const newBatches = batches.filter(b => !b.dbId);

    if (newBatches.length) {
      const payload = newBatches.map(b => ({
        event_id: eventId,
        name: b.name,
        price_cents: Math.round(b.price * 100),
        total_quantity: b.quantity,
        service_fee_percent: b.fee_percent,
        min_service_fee_cents: 200,
        is_active: true,
      }));

      const { error } = await supabase
        .from("ticket_batches")
        .insert(payload);

      if (error) throw error;
    }

    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}/edit`);

    return { success: true };

  } catch (error) {
    console.error("Erro no update:", error);
    return { error: error.message || "Erro ao atualizar evento." };
  }
}

