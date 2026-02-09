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

    const { qrToken } = await req.json();
    const payload = verifyTicketHash(qrToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "QR CODE FALSO OU INVÁLIDO" },
        { status: 400 }
      );
    }

    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .select("*, events(title), ticket_batches(name)")
      .eq("id", payload.tid)
      .single();

    if (error || !ticket) {
      return NextResponse.json(
        { success: false, message: "Ingresso não encontrado no sistema" },
        { status: 404 }
      );
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
    console.error(err);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}
