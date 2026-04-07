import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createSupabaseServer } from "@/lib/supabase-server";

/**
 * POST - Cria nova atribuição de staff a evento
 */
export async function POST(request) {
  try {
    // 1. Verifica autenticação e autorização
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verifica se é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { message: "Acesso negado. Apenas admins podem atribuir staffs." },
        { status: 403 }
      );
    }

    // 2. Parse do body
    const { staff_id, event_id } = await request.json();

    if (!staff_id || !event_id) {
      return NextResponse.json(
        { message: "staff_id e event_id são obrigatórios" },
        { status: 400 }
      );
    }

    // 3. Verifica se o staff e o evento existem
    const adminSupabase = getSupabaseAdmin();

    const { data: staffProfile, error: staffError } = await adminSupabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", staff_id)
      .single();

    console.log("Staff lookup:", { staff_id, staffProfile, staffError });

    if (!staffProfile) {
      return NextResponse.json(
        { message: `Staff não encontrado. Verifique se o ID está correto: ${staff_id}` },
        { status: 404 }
      );
    }

    // Aceita staff ou admin (admin também pode validar ingressos)
    if (staffProfile.role !== "staff" && staffProfile.role !== "admin") {
      return NextResponse.json(
        { 
          message: `Usuário ${staffProfile.email} tem role "${staffProfile.role}". Apenas usuários com role "staff" ou "admin" podem ser atribuídos.` 
        },
        { status: 400 }
      );
    }

    const { data: eventExists } = await adminSupabase
      .from("events")
      .select("id")
      .eq("id", event_id)
      .single();

    if (!eventExists) {
      return NextResponse.json(
        { message: "Evento não encontrado" },
        { status: 404 }
      );
    }

    // 4. Cria a atribuição
    const { data: assignment, error } = await adminSupabase
      .from("staff_assignments")
      .insert({
        staff_id,
        event_id,
      })
      .select()
      .single();

    console.log("=== DEBUG: Tentativa de criar atribuição ===");
    console.log("Insert data:", { staff_id, event_id });
    console.log("Result:", assignment);
    console.log("Error:", error);

    if (error) {
      // Se já existe (constraint unique)
      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Este staff já está atribuído a este evento" },
          { status: 409 }
        );
      }

      console.error("Erro ao criar atribuição:", error);
      return NextResponse.json(
        { 
          message: "Erro ao criar atribuição",
          debug: {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Atribuição criada com sucesso",
      data: assignment,
    });
  } catch (error) {
    console.error("Erro na rota POST /api/admin/staff/assignments:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove atribuição de staff
 */
export async function DELETE(request) {
  try {
    // 1. Verifica autenticação e autorização
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verifica se é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { message: "Acesso negado. Apenas admins podem remover atribuições." },
        { status: 403 }
      );
    }

    // 2. Parse do body
    const { assignment_id } = await request.json();

    if (!assignment_id) {
      return NextResponse.json(
        { message: "assignment_id é obrigatório" },
        { status: 400 }
      );
    }

    // 3. Remove a atribuição
    const adminSupabase = getSupabaseAdmin();

    const { error } = await adminSupabase
      .from("staff_assignments")
      .delete()
      .eq("id", assignment_id);

    if (error) {
      console.error("Erro ao remover atribuição:", error);
      return NextResponse.json(
        { message: "Erro ao remover atribuição" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Atribuição removida com sucesso",
    });
  } catch (error) {
    console.error("Erro na rota DELETE /api/admin/staff/assignments:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
