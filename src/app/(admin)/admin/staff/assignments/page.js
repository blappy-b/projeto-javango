import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Calendar, Plus, X } from "lucide-react";
import StaffAssignmentManager from "@/components/admin/StaffAssignmentManager";

export const dynamic = "force-dynamic";

export default async function StaffAssignmentsPage() {
  const supabase = await createSupabaseServer();

  // 1. Verifica se é admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  // 2. Busca todos os staffs (e admins, que também podem validar)
  const { data: staffs } = await supabase
    .from("profiles")
    .select("id, email, role")
    .in("role", ["staff", "admin"])
    .order("email");

  // 3. Busca todos os eventos (published ou draft)
  const { data: events } = await supabase
    .from("events")
    .select("id, title, start_date, status")
    .in("status", ["draft", "published"])
    .order("start_date", { ascending: false });

  // 4. Busca todas as atribuições existentes
  const { data: assignments } = await supabase
    .from("staff_assignments")
    .select(`
      id,
      staff_id,
      event_id,
      events (
        title
      )
    `);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-red-primary hover:underline flex items-center gap-2 mb-4"
          >
            <ArrowLeft size={18} />
            Voltar ao Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="text-red-primary" />
            Atribuição de Staffs
          </h1>
          <p className="text-gray-500 mt-2">
            Atribua membros da equipe aos eventos para validação de ingressos
          </p>
        </div>

        {/* Mensagens se não houver dados */}
        {!staffs || staffs.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-xl">
            <p className="font-bold">⚠️ Nenhum staff cadastrado</p>
            <p className="text-sm mt-2">
              Crie usuários com a role "staff" no painel do Supabase primeiro.
            </p>
          </div>
        ) : !events || events.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-xl">
            <p className="font-bold">⚠️ Nenhum evento cadastrado</p>
            <p className="text-sm mt-2">
              <Link href="/admin/events/new" className="text-red-primary underline">
                Crie um evento primeiro
              </Link>
            </p>
          </div>
        ) : (
          <StaffAssignmentManager 
            staffs={staffs} 
            events={events} 
            assignments={assignments || []} 
          />
        )}
      </div>
    </div>
  );
}
