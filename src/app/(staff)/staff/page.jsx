"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import QRScanner from "@/components/staff/QRScanner";
import ManualSearch from "@/components/staff/ManualSearch";
import { Search, QrCode, ChevronDown, AlertCircle } from "lucide-react";
import { useDebug } from "@/components/debug/MobileDebugger";

export default function StaffScannerPage() {
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noAssignments, setNoAssignments] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const debug = useDebug();

  useEffect(() => {
    async function loadAssignments() {
      try {
        debug.log('Carregando usuário e atribuições...');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          debug.warn('Usuário não autenticado, redirecionando...');
          router.replace("/login");
          return;
        }

        debug.log('Usuário autenticado', { userId: user.id, email: user.email });

        // Check role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          debug.error('Erro ao buscar perfil', { error: profileError.message });
        }

        debug.log('Perfil carregado', { role: profile?.role });

        // Admin can see all events, staff only assigned ones
        if (profile?.role === "admin") {
          const { data: events, error: eventsError } = await supabase
            .from("events")
            .select("id, title, start_date")
            .in("status", ["published", "ended"])
            .order("start_date", { ascending: false });

          if (eventsError) {
            debug.error('Erro ao buscar eventos', { error: eventsError.message });
          }

          setAssignedEvents(events || []);
          if (events?.length > 0) {
            setSelectedEventId(events[0].id);
            debug.success('Admin: eventos carregados', { count: events.length });
          }
        } else if (profile?.role === "staff") {
          const { data: assignments, error: assignError } = await supabase
            .from("staff_assignments")
            .select(`
              event_id,
              events (
                id,
                title,
                start_date
              )
            `)
            .eq("staff_id", user.id);

          if (assignError) {
            debug.error('Erro ao buscar atribuições', { error: assignError.message });
          }

          const events = assignments?.map(a => a.events).filter(Boolean) || [];
          setAssignedEvents(events);
          
          if (events.length > 0) {
            setSelectedEventId(events[0].id);
            debug.success('Staff: eventos atribuídos carregados', { count: events.length });
          } else {
            debug.warn('Nenhum evento atribuído a este staff');
            setNoAssignments(true);
          }
        } else {
          debug.warn('Role não autorizado, redirecionando...', { role: profile?.role });
          router.replace("/");
          return;
        }
      } catch (error) {
        debug.error("Erro ao carregar dados", { message: error.message });
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-primary"></div>
      </div>
    );
  }

  if (noAssignments) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">
          Sem eventos atribuídos
        </h2>
        <p className="text-gray-400">
          Você ainda não foi atribuído a nenhum evento.
          Entre em contato com o administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Event Selector */}
      {assignedEvents.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Evento selecionado:
          </label>
          <div className="relative">
            <select
              value={selectedEventId || ""}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pr-10 text-white appearance-none focus:outline-none focus:border-red-primary"
            >
              {assignedEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Single event display */}
      {assignedEvents.length === 1 && (
        <div className="mb-4 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3">
          <p className="text-sm text-gray-400">Evento:</p>
          <p className="font-semibold text-white">{assignedEvents[0].title}</p>
        </div>
      )}

      {/* Scanner or Manual Search */}
      {!showManualSearch ? (
        <div className="space-y-4">
          {/* QR Scanner */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-red-primary" />
              <h2 className="font-semibold">Escanear QR Code</h2>
            </div>
            <QRScanner eventId={selectedEventId} />
          </div>

          {/* Manual Search Fallback Button */}
          <button
            onClick={() => setShowManualSearch(true)}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white py-4 rounded-xl transition-colors"
          >
            <Search className="w-5 h-5" />
            <span>Busca Manual (Nome/CPF)</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Back to Scanner Button */}
          <button
            onClick={() => setShowManualSearch(false)}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white py-3 rounded-xl transition-colors"
          >
            <QrCode className="w-5 h-5" />
            <span>Voltar ao Scanner</span>
          </button>

          {/* Manual Search Component */}
          <ManualSearch eventId={selectedEventId} />
        </div>
      )}
    </div>
  );
}
