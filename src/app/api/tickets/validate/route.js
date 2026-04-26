import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase-server";
import { verifyTicketHash } from "@/lib/security";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autenticado" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "staff" && profile?.role !== "admin") {
      return NextResponse.json({ success: false, message: "Sem permissão" }, { status: 403 });
    }

    const body = await req.json();
    const { qrToken, ticketId } = body;

    // Determine ticket ID from either qrToken or direct ticketId
    let resolvedTicketId = null;

    if (qrToken) {
      // QR Code flow
      const payload = verifyTicketHash(qrToken);
      if (!payload) {
        return NextResponse.json(
          { success: false, message: "QR CODE FALSO OU INVÁLIDO" },
          { status: 400 }
        );
      }
      resolvedTicketId = payload.tid;
    } else if (ticketId) {
      // Manual validation flow
      resolvedTicketId = ticketId;
    } else {
      return NextResponse.json(
        { success: false, message: "QR Token ou Ticket ID necessário" },
        { status: 400 }
      );
    }

    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .select("*, events(title), ticket_batches(name)")
      .eq("id", resolvedTicketId)
      .single();

    if (error || !ticket) {
      return NextResponse.json(
        { success: false, message: "Ingresso não encontrado no sistema" },
        { status: 404 }
      );
    }

    // For staff (not admin), verify they are assigned to this event
    if (profile.role === "staff") {
      const { data: assignment } = await supabaseAdmin
        .from("staff_assignments")
        .select("id")
        .eq("staff_id", user.id)
        .eq("event_id", ticket.event_id)
        .single();

      if (!assignment) {
        return NextResponse.json(
          { success: false, message: "Você não tem permissão para validar este evento" },
          { status: 403 }
        );
      }
    }

    if (ticket.status === "used") {
      return NextResponse.json(
        {
          success: false,
          message: `JÁ UTILIZADO em ${new Date(ticket.validated_at).toLocaleTimeString("pt-BR")}`,
          code: "ALREADY_USED",
        },
        { status: 409 }
      );
    }

    if (ticket.status === "cancelled") {
      return NextResponse.json({ success: false, message: "Ingresso CANCELADO" }, { status: 403 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("tickets")
      .update({
        status: "used",
        validated_at: new Date().toISOString(),
        validated_by: user.id,
      })
      .eq("id", ticket.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: {
        owner: ticket.guest_name || "Participante",
        event: ticket.events?.title,
        type: ticket.ticket_batches?.name || "Ingresso",
      },
    });
  } catch (err) {
    console.error('Ticket validation error:', err);
    return NextResponse.json({ 
      success: false, 
      message: "Erro interno no servidor",
      debug: {
        errorName: err.name,
        errorMessage: err.message,
        errorCode: err.code,
        errorDetails: err.details,
        errorHint: err.hint,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

