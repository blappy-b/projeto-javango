import { createSupabaseServer } from "@/lib/supabase-server";
import CreateEventForm from "@/components/admin/CreateEventForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export default async function EditEventPage({ params }) {
  const supabase = await createSupabaseServer();
  const { id } = await params;

  // Busca evento + lotes
  const { data: event, error } = await supabase
    .from("events")
    .select(`*, ticket_batches(*)`)
    .eq("id", id)
    .single();

  if (error || !event) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/events" 
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Evento</h1>
          <p className="text-gray-500 text-sm">Alterar informações de &quot;{event.title}&quot;</p>
        </div>
      </div>

      {/* Passamos os dados existentes para o formulário */}
      <CreateEventForm initialData={event} />
    </div>
  );
}