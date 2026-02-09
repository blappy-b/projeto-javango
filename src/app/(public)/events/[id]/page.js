import { createSupabaseServer } from "@/lib/supabase-server"; // Seu helper de server-side
import { notFound } from "next/navigation";
import TicketSelection from "@/components/events/TicketSelection";
import { Calendar, MapPin, Share2 } from "lucide-react";
import Image from "next/image"; // Se tiver imagem
import ShareEventButton from "@/components/events/ShareEventButton";

// Gera metadados dinâmicos para SEO
export async function generateMetadata({ params }) {
  const supabase = await createSupabaseServer();
  const { id } = await params;
  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: event ? `${event.title} - Ingressos` : "Evento não encontrado",
  };
}

export default async function EventDetailsPage({ params }) {
  const supabase = await createSupabaseServer();
  const { id } = await params;

  // Busca Evento + Lotes
  const { data: event, error } = await supabase
    .from("events")
    .select(
      `
      *,
      ticket_batches ( * )
    `
    )
    .eq("id", id)
    .single();

  if (error || !event) {
    return notFound();
  }

  // Ordena lotes pelo preço (menor para maior)
  const sortedBatches = event.ticket_batches.sort(
    (a, b) => a.price_cents - b.price_cents
  );

  // Formatação de data
  const startDate = new Date(event.start_date);
  const formattedDate = startDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = startDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero / Header (Imagem de Fundo Simulada) */}
      <div className="h-64 md:h-80 bg-slate-900 relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-linear-to-t from-gray-900 to-transparent" />

        <div className="relative z-10 text-center px-4 max-w-4xl">
          {/* Tag de Status */}
          {event.status !== "published" && (
            <span className="inline-block px-3 py-1 mb-4 rounded-full bg-yellow-500 text-yellow-950 font-bold text-xs uppercase tracking-wider">
              {event.status === "draft" ? "Rascunho" : "Encerrado"}
            </span>
          )}
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 leading-tight">
            {event.title}
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal: Informações */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card de Informações Chave */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-primary flex items-center justify-center text-red-primary shrink-0">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    Data e Hora
                  </p>
                  <p className="text-gray-900 font-bold capitalize">
                    {formattedDate}
                  </p>
                  <p className="text-gray-600">{formattedTime}</p>
                </div>
              </div>

              <div className="w-px h-12 bg-gray-200 hidden md:block" />

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    Localização
                  </p>
                  <p className="text-gray-900 font-bold">{event.location}</p>
                  <a
                    href={`https://maps.google.com/?q=${event.location}`}
                    target="_blank"
                    className="text-blue-600 text-xs hover:underline"
                  >
                    Ver no mapa
                  </a>
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Sobre o Evento
              </h2>
              <div className="prose prose-red max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                {event.description ||
                  "Nenhuma descrição informada pelo organizador."}
              </div>
            </div>
          </div>

          {/* Coluna Lateral: Compra */}
          <div className="lg:col-span-1">
            <TicketSelection eventId={event.id} batches={sortedBatches} />

            <ShareEventButton
              eventId={event.id}
              title={event.title}
              location={event.location}
              startDate={event.start_date}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
