import { createSupabaseServer } from "@/lib/supabase-server";
import EventCard from "@/components/events/EventCard";
import { Music } from "lucide-react";

// Isso garante que a página sempre busque dados novos (não faz cache estático)
export const dynamic = "force-dynamic";

export default async function Home() {
  // 1. Conecta no banco (lado do servidor)
  const supabase = await createSupabaseServer();

  // 2. Busca eventos PUBLICADOS e ordena por data (mais próximo primeiro)
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("end_date", new Date().toISOString())
    .order("start_date", { ascending: true });

  console.log(events);
  console.log(error);

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* --- HERO SECTION (Topo chamativo) --- */}
      <section className="bg-dark-gray text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center justify-center p-3 bg-red-primary rounded-full mb-6">
            <Music size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Próximas Apresentações
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Garanta seu ingresso para os recitais, shows e festivais da nossa
            escola. Venha prestigiar o talento dos nossos alunos!
          </p>
        </div>
      </section>

      {/* --- LISTA DE EVENTOS --- */}
      <section className="max-w-7xl mx-auto px-4 -mt-10">
        {/* Tratamento de Erro */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center shadow-sm">
            Erro ao carregar eventos. Tente recarregar a página.
          </div>
        )}

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events?.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {/* Estado Vazio (Sem eventos) */}
        {!error && events?.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100 mt-8">
            <h3 className="text-xl font-medium text-dark-gray">
              Nenhum evento agendado 😢
            </h3>
            <p className="text-gray-500 mt-2">
              Fique ligado! Em breve teremos novas apresentações.
            </p>
          </div>
        )}
      </section>

      {/* Footer Simples */}
      <footer className="mt-20 text-center text-gray-400 text-sm pb-8">
        <p>
          © {new Date().getFullYear()} Javango Jango - Sistema de Ingressos
        </p>
      </footer>
    </main>
  );
}
