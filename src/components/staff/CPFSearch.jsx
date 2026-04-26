"use client";

import { useState } from "react";
import { Search, Loader2, CheckCircle, XCircle, User, AlertTriangle, Ticket } from "lucide-react";

export default function CPFSearch({ eventId }) {
  const [cpf, setCpf] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [validating, setValidating] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Format CPF as user types: 123.456.789-01
  const formatCpf = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  // Mask CPF for display: 123.456.789-01 -> ***456***01
  const maskCpf = (cpfValue) => {
    if (!cpfValue) return "—";
    const clean = cpfValue.replace(/\D/g, "");
    if (clean.length !== 11) return cpfValue.slice(0, 3) + "***";
    return `***${clean.slice(3, 6)}***${clean.slice(9, 11)}`;
  };

  const handleCpfChange = (e) => {
    setCpf(formatCpf(e.target.value));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length < 3) return;

    setLoading(true);
    setSearched(true);
    setFeedback(null);

    try {
      const params = new URLSearchParams({
        search: cleanCpf,
        ...(eventId && { eventId }),
      });

      const res = await fetch(`/api/staff/tickets?${params}`);
      const data = await res.json();

      if (res.ok) {
        setResults(data.tickets || []);
      } else {
        setResults([]);
        setFeedback({ type: "error", message: data.message || "Erro na busca" });
      }
    } catch (error) {
      setResults([]);
      setFeedback({ type: "error", message: "Erro de conexão" });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (ticketId) => {
    setValidating(ticketId);
    setFeedback(null);

    try {
      const res = await fetch("/api/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });

      const data = await res.json();

      if (res.ok) {
        setResults((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: "used" } : t))
        );
        setFeedback({
          type: "success",
          message: `Validado: ${data.data?.owner || "Participante"}`,
        });
        // Vibrate on success
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Erro ao validar",
        });
        if (navigator.vibrate) navigator.vibrate([300]);
      }
    } catch (error) {
      setFeedback({ type: "error", message: "Erro de conexão" });
    } finally {
      setValidating(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "used":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-700/50 px-2.5 py-1.5 rounded-lg">
            <CheckCircle className="w-3.5 h-3.5" />
            Utilizado
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded-lg">
            <XCircle className="w-3.5 h-3.5" />
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Search Header */}
      <div className="p-5 border-b border-gray-700">
        <form onSubmit={handleSearch} className="flex flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={cpf}
              onChange={handleCpfChange}
              placeholder="Digite o CPF"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-primary focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || cpf.replace(/\D/g, "").length < 3}
            className="w-full bg-red-primary hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Buscar Ingressos
              </>
            )}
          </button>
        </form>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div className={`mx-5 mt-5 p-4 rounded-xl flex items-center gap-3 ${
          feedback.type === "success"
            ? "bg-green-500/10 text-green-400 border border-green-500/30"
            : "bg-red-500/10 text-red-400 border border-red-500/30"
        }`}>
          {feedback.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Results */}
      <div className="p-5">
        {!searched ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-700/30 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-500">Digite um CPF para buscar ingressos</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-700/30 flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400 font-medium mb-1">Nenhum ingresso encontrado</p>
            <p className="text-gray-500 text-sm">Verifique o CPF e tente novamente</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 mb-4">
              {results.length} ingresso{results.length > 1 ? "s" : ""} encontrado{results.length > 1 ? "s" : ""}
            </p>
            
            {results.map((ticket) => (
              <div
                key={ticket.id}
                className={`bg-gray-900 border rounded-xl p-4 transition-all ${
                  ticket.status === "used" || ticket.status === "cancelled"
                    ? "border-gray-800 opacity-60"
                    : "border-gray-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="font-semibold text-white truncate">
                        {ticket.guest_name || "Sem nome"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 ml-6">
                      CPF: {maskCpf(ticket.cpf)}
                    </p>
                    {ticket.event_title && (
                      <p className="text-sm text-gray-500 mt-1 ml-6 truncate">
                        {ticket.event_title}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {ticket.status === "valid" ? (
                      <button
                        onClick={() => handleValidate(ticket.id)}
                        disabled={validating === ticket.id}
                        className="bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                      >
                        {validating === ticket.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Validar
                          </>
                        )}
                      </button>
                    ) : (
                      getStatusBadge(ticket.status)
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
