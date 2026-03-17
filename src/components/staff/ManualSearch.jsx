"use client";

import { useState } from "react";
import { Search, Loader2, CheckCircle, XCircle, User, AlertCircle } from "lucide-react";

export default function ManualSearch({ eventId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [validating, setValidating] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Mask CPF for privacy: 123.456.789-01 -> ***456***01
  const maskCpf = (cpf) => {
    if (!cpf) return "—";
    const clean = cpf.replaceAll(/\D/g, "");
    if (clean.length !== 11) return cpf.substring(0, 3) + "***";
    return `***${clean.substring(3, 6)}***${clean.substring(9, 11)}`;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      return;
    }

    setLoading(true);
    setSearched(true);
    setFeedback(null);

    try {
      const params = new URLSearchParams({
        search: searchQuery.trim(),
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
      console.error("Search error:", error);
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
        // Update the ticket in the list
        setResults((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, status: "used" } : t
          )
        );
        setFeedback({
          type: "success",
          message: `✓ Validado: ${data.data?.owner || "Participante"}`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Erro ao validar",
        });
      }
    } catch (error) {
      console.error("Validation error:", error);
      setFeedback({ type: "error", message: "Erro de conexão" });
    } finally {
      setValidating(null);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-red-primary" />
          Busca Manual
        </h2>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nome ou CPF (min. 3 caracteres)"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-primary"
          />
          <button
            type="submit"
            disabled={loading || searchQuery.trim().length < 3}
            className="bg-red-primary hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-green-900/50 text-green-300 border border-green-700"
              : "bg-red-900/50 text-red-300 border border-red-700"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Results Table */}
      <div className="p-4">
        {!searched ? (
          <p className="text-gray-500 text-center py-8">
            Digite o nome ou CPF para buscar ingressos
          </p>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : results.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Nenhum ingresso encontrado
          </p>
        ) : (
          <div className="space-y-3">
            {results.map((ticket) => (
              <div
                key={ticket.id}
                className={`bg-gray-900 border rounded-lg p-4 ${
                  ticket.status === "used"
                    ? "border-gray-700 opacity-60"
                    : "border-gray-600"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Name */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="font-medium text-white truncate">
                        {ticket.guest_name || "Sem nome"}
                      </span>
                    </div>

                    {/* CPF */}
                    <p className="text-sm text-gray-400 mt-1 ml-6">
                      CPF: {maskCpf(ticket.cpf)}
                    </p>

                    {/* Event (if searching across events) */}
                    {ticket.event_title && (
                      <p className="text-sm text-gray-500 mt-1 ml-6 truncate">
                        {ticket.event_title}
                      </p>
                    )}
                  </div>

                  {/* Status / Action */}
                  <div className="shrink-0">
                    {ticket.status === "used" ? (
                      <span className="inline-flex items-center gap-1 text-sm text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg">
                        <CheckCircle className="w-4 h-4" />
                        Usado
                      </span>
                    ) : ticket.status === "cancelled" ? (
                      <span className="inline-flex items-center gap-1 text-sm text-red-400 bg-red-900/30 px-3 py-1.5 rounded-lg">
                        <XCircle className="w-4 h-4" />
                        Cancelado
                      </span>
                    ) : (
                      <button
                        onClick={() => handleValidate(ticket.id)}
                        disabled={validating === ticket.id}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
