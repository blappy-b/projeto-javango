"use client";

import { useState } from "react";
import { Plus, X, Calendar, User, AlertCircle } from "lucide-react";

export default function StaffAssignmentManager({ staffs, events, assignments }) {
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Agrupa atribuições por staff
  const assignmentsByStaff = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.staff_id]) {
      acc[assignment.staff_id] = [];
    }
    acc[assignment.staff_id].push(assignment);
    return acc;
  }, {});

  // Adiciona atribuição
  const handleAddAssignment = async () => {
    if (!selectedStaff || !selectedEvent) {
      setMessage({ type: "error", text: "Selecione um staff e um evento" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/staff/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: selectedStaff,
          event_id: selectedEvent,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Atribuição criada com sucesso!" });
        setSelectedEvent("");
        // Recarrega a página após 1 segundo
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage({ type: "error", text: data.message || "Erro ao criar atribuição" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro de conexão" });
    } finally {
      setLoading(false);
    }
  };

  // Remove atribuição
  const handleRemoveAssignment = async (assignmentId) => {
    if (!confirm("Deseja remover esta atribuição?")) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/staff/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignmentId }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Atribuição removida com sucesso!" });
        // Recarrega a página após 1 segundo
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage({ type: "error", text: data.message || "Erro ao remover atribuição" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro de conexão" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mensagem de feedback */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <AlertCircle size={20} className="mt-0.5" />
          <p>{message.text}</p>
        </div>
      )}

      {/* Lista de Staffs */}
      <div className="grid md:grid-cols-2 gap-6">
        {staffs.map((staff) => {
          const staffAssignments = assignmentsByStaff[staff.id] || [];
          const isSelected = selectedStaff === staff.id;

          return (
            <div
              key={staff.id}
              className={`bg-white rounded-xl shadow-sm border-2 transition-all ${
                isSelected
                  ? "border-red-primary shadow-lg"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Header do Card */}
              <div
                className={`p-4 border-b cursor-pointer ${
                  isSelected ? "bg-red-50" : "bg-gray-50"
                }`}
                onClick={() => setSelectedStaff(isSelected ? null : staff.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        isSelected ? "bg-red-primary" : "bg-gray-300"
                      }`}
                    >
                      <User
                        size={20}
                        className={isSelected ? "text-white" : "text-gray-600"}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{staff.email}</p>
                      <p className="text-xs text-gray-500 uppercase">
                        {staff.role === "admin" ? "Admin" : "Staff"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      staffAssignments.length > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {staffAssignments.length}{" "}
                    {staffAssignments.length === 1 ? "evento" : "eventos"}
                  </div>
                </div>
              </div>

              {/* Lista de Eventos Atribuídos */}
              <div className="p-4">
                {staffAssignments.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    Nenhum evento atribuído
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {staffAssignments.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-red-primary" />
                          <span className="text-sm font-medium text-gray-700">
                            {assignment.events?.title || "Evento sem título"}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          disabled={loading}
                          className="text-red-600 hover:bg-red-50 p-1 rounded transition disabled:opacity-50"
                          title="Remover atribuição"
                        >
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Formulário de Adicionar - aparece quando staff está selecionado */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adicionar ao evento:
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        disabled={loading}
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-primary outline-none disabled:opacity-50"
                      >
                        <option value="">Selecione um evento</option>
                        {events.map((event) => {
                          // Verifica se já está atribuído
                          const alreadyAssigned = staffAssignments.some(
                            (a) => a.event_id === event.id
                          );
                          return (
                            <option
                              key={event.id}
                              value={event.id}
                              disabled={alreadyAssigned}
                            >
                              {event.title}
                              {alreadyAssigned ? " (já atribuído)" : ""}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        onClick={handleAddAssignment}
                        disabled={loading || !selectedEvent}
                        className="bg-red-primary text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
