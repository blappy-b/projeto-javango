"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import QRScanner from "@/components/staff/QRScanner";
import CPFSearch from "@/components/staff/CPFSearch";
import { Search, QrCode, ChevronDown, AlertCircle, Calendar, MapPin } from "lucide-react";

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState("qr"); // "qr" or "cpf"
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noAssignments, setNoAssignments] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function loadAssignments() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin") {
          const { data: events } = await supabase
            .from("events")
            .select("id, title, start_date, location")
            .eq("status", "published")
            .gte("start_date", new Date().toISOString())
            .order("start_date", { ascending: true });

          setAssignedEvents(events || []);
          if (events?.length > 0) {
            setSelectedEvent(events[0]);
          }
        } else if (profile?.role === "staff") {
          const { data: assignments } = await supabase
            .from("staff_assignments")
            .select(`
              event_id,
              events (id, title, start_date, location)
            `)
            .eq("staff_id", user.id);

          const events = assignments?.map(a => a.events).filter(Boolean) || [];
          setAssignedEvents(events);
          
          if (events.length > 0) {
            setSelectedEvent(events[0]);
          } else {
            setNoAssignments(true);
          }
        } else {
          router.replace("/");
          return;
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-red-primary border-t-transparent" />
      </div>
    );
  }

  if (noAssignments) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">
          Sem eventos atribuídos
        </h2>
        <p className="text-gray-400 max-w-sm">
          Você ainda não foi atribuído a nenhum evento. Entre em contato com o administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Event Selector - Only show if more than one event */}
      {assignedEvents.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Selecione o evento
          </label>
          <div className="relative">
            <select
              value={selectedEvent?.id || ""}
              onChange={(e) => {
                const event = assignedEvents.find(ev => ev.id === e.target.value);
                setSelectedEvent(event);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 pr-12 text-white text-lg font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-red-primary focus:border-transparent transition-all"
            >
              {assignedEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Current Event Card */}
      {selectedEvent && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-5 mb-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-3">{selectedEvent.title}</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {selectedEvent.start_date && (
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="w-4 h-4 text-red-primary" />
                <span>{formatDate(selectedEvent.start_date)}</span>
              </div>
            )}
            {selectedEvent.location && (
              <div className="flex items-center gap-2 text-gray-300">
                <MapPin className="w-4 h-4 text-red-primary" />
                <span className="truncate max-w-[180px]">{selectedEvent.location}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-gray-800/50 rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab("qr")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
            activeTab === "qr"
              ? "bg-red-primary text-white shadow-lg"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <QrCode className="w-5 h-5" />
          <span>QR Code</span>
        </button>
        <button
          onClick={() => setActiveTab("cpf")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
            activeTab === "cpf"
              ? "bg-red-primary text-white shadow-lg"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Buscar CPF</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        {activeTab === "qr" ? (
          <QRScanner eventId={selectedEvent?.id} />
        ) : (
          <CPFSearch eventId={selectedEvent?.id} />
        )}
      </div>
    </div>
  );
}
