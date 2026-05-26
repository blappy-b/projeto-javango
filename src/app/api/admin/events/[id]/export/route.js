import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/events/[id]/export
 * Exporta tickets do evento para XLSX
 * Cada ticket em uma linha separada, ordenado por CPF
 */
export async function GET(request, { params }) {
  try {
    const { id: eventId } = await params;
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

    // Usar cliente admin para bypassar RLS
    const supabaseAdmin = getSupabaseAdmin();

    // Buscar dados do evento
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, title")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    // Buscar todos os tickets do evento
    const { data: tickets, error: ticketsError } = await supabaseAdmin
      .from("tickets")
      .select(`
        id,
        user_id,
        guest_name,
        status,
        paid_price_cents,
        paid_fee_cents,
        purchased_at,
        validated_at,
        order_id,
        batch_id
      `)
      .eq("event_id", eventId)
      .neq("status", "cancelled")
      .order("purchased_at", { ascending: true });

    if (ticketsError) {
      console.error("Erro ao buscar tickets:", ticketsError);
      return NextResponse.json({ error: "Erro ao buscar tickets" }, { status: 500 });
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: "Nenhum ticket encontrado" }, { status: 404 });
    }

    // Buscar IDs únicos de usuários e batches
    const userIds = [...new Set(tickets.map(t => t.user_id).filter(Boolean))];
    const batchIds = [...new Set(tickets.map(t => t.batch_id).filter(Boolean))];
    console.log("User IDs:", userIds);
    // Buscar profiles dos compradores
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .in("id", userIds);

    // Buscar batches
    const { data: batches } = await supabaseAdmin
      .from("ticket_batches")
      .select("id, name, price_cents")
      .in("id", batchIds);

    console.log('perfis:' ,profiles)
    // Criar mapas para lookup rápido
    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
    const batchesMap = new Map((batches || []).map(b => [b.id, b]));

    // Preparar dados para a planilha - uma linha por ticket
    const rows = tickets
      .map(ticket => {
        const profile = profilesMap.get(ticket.user_id);
        const batch = batchesMap.get(ticket.batch_id);
        return {
          "CPF": profile?.cpf || "",
          "Nome Completo": profile?.full_name || "",
          "Nome no Ingresso": ticket.guest_name || profile?.full_name || "",
          "Tipo de Ingresso": batch?.name || "",
          "Data da Compra": formatDate(ticket.purchased_at),
          "Data da Validação": ticket.validated_at ? formatDate(ticket.validated_at) : "",        };
      })
      // Ordenar por CPF
      .sort((a, b) => {
        const cpfA = a["CPF"] || "";
        const cpfB = b["CPF"] || "";
        return cpfA.localeCompare(cpfB);
      });

    // Criar workbook e worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Compras");

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 15 }, // CPF
      { wch: 30 }, // Nome Completo
      { wch: 30 }, // Nome no Ingresso
      { wch: 20 }, // Tipo de Ingresso
      { wch: 20 }, // Data da Compra
      { wch: 20 }, // Data da Validação
    ];
    worksheet["!cols"] = colWidths;

    // Gerar buffer do arquivo
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Nome do arquivo sanitizado
    const safeTitle = event.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);
    const fileName = `compras_${safeTitle}_${formatDateForFile(new Date())}.xlsx`;

    // Retornar arquivo como download
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao exportar tickets:", error);
    return NextResponse.json({ error: "Erro interno ao exportar" }, { status: 500 });
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateForFile(date) {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}
