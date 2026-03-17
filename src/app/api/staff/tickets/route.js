import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autenticado" },
        { status: 401 }
      );
    }

    // Check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "staff" && profile?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Sem permissão" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const eventId = searchParams.get("eventId");

    if (!search || search.length < 3) {
      return NextResponse.json(
        { success: false, message: "Busca muito curta (mínimo 3 caracteres)" },
        { status: 400 }
      );
    }

    // Get allowed event IDs for this staff member
    let allowedEventIds = [];

    if (profile.role === "admin") {
      // Admin can search all events
      if (eventId) {
        allowedEventIds = [eventId];
      }
      // If no eventId specified, search all (no filter)
    } else {
      // Staff can only search assigned events
      const { data: assignments } = await supabaseAdmin
        .from("staff_assignments")
        .select("event_id")
        .eq("staff_id", user.id);

      allowedEventIds = assignments?.map((a) => a.event_id) || [];

      if (allowedEventIds.length === 0) {
        return NextResponse.json(
          { success: false, message: "Você não está atribuído a nenhum evento" },
          { status: 403 }
        );
      }

      // If eventId specified, verify it's in allowed list
      if (eventId && !allowedEventIds.includes(eventId)) {
        return NextResponse.json(
          { success: false, message: "Você não tem permissão para este evento" },
          { status: 403 }
        );
      }

      // If eventId specified, filter by it
      if (eventId) {
        allowedEventIds = [eventId];
      }
    }

    // Clean search query (remove CPF formatting)
    const cleanSearch = search.replaceAll(/\D/g, "");
    const isLikelyCpf = cleanSearch.length >= 3 && /^\d+$/.test(cleanSearch);

    // Build query
    let query = supabaseAdmin
      .from("tickets")
      .select(`
        id,
        guest_name,
        cpf,
        status,
        validated_at,
        event_id,
        events (
          id,
          title
        )
      `)
      .order("purchased_at", { ascending: false })
      .limit(20);

    // Filter by allowed events (for staff)
    if (allowedEventIds.length > 0) {
      query = query.in("event_id", allowedEventIds);
    }

    // Search by name OR CPF
    if (isLikelyCpf) {
      // If it looks like a CPF (digits only), search CPF field
      query = query.ilike("cpf", `%${cleanSearch}%`);
    } else {
      // Otherwise search by name
      query = query.ilike("guest_name", `%${search}%`);
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error("Search error:", error);
      throw error;
    }

    // Format response (mask CPF for privacy)
    const formattedTickets = tickets.map((ticket) => ({
      id: ticket.id,
      guest_name: ticket.guest_name || "Sem nome",
      cpf: ticket.cpf, // Will be masked on frontend
      status: ticket.status,
      event_id: ticket.event_id,
      event_title: ticket.events?.title,
      validated_at: ticket.validated_at,
    }));

    return NextResponse.json({
      success: true,
      tickets: formattedTickets,
      count: formattedTickets.length,
    });
  } catch (err) {
    console.error("Staff tickets search error:", err);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
