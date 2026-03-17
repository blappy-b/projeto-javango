"use client";

import { useState } from "react";
import { Loader2, Ticket as TicketIcon, X, User, CreditCard } from "lucide-react";
import { formatCurrency, calculateFinalPrice } from "@/utils/price";
import { createSupabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// CPF validation helper
function isValidCpf(cpf) {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false; // All same digits
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(clean[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  if (d2 !== parseInt(clean[10])) return false;

  return true;
}

// CPF formatting helper
function formatCpf(value) {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

export default function EventPurchase({ eventId, batches, userId }) {
  const [loading, setLoading] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [cpf, setCpf] = useState("");
  const [errors, setErrors] = useState({});
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const openCheckoutModal = (batch) => {
    setSelectedBatch(batch);
    setGuestName("");
    setCpf("");
    setErrors({});
  };

  const closeModal = () => {
    setSelectedBatch(null);
    setGuestName("");
    setCpf("");
    setErrors({});
  };

  const handleCpfChange = (e) => {
    setCpf(formatCpf(e.target.value));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!guestName.trim() || guestName.trim().length < 3) {
      newErrors.guestName = "Nome completo é obrigatório";
    }
    
    const cleanCpf = cpf.replace(/\D/g, "");
    if (!cleanCpf) {
      newErrors.cpf = "CPF é obrigatório";
    } else if (!isValidCpf(cpf)) {
      newErrors.cpf = "CPF inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePurchase = async () => {
    if (!validateForm()) return;

    setLoading(selectedBatch.id);
    
    try {
      const { total, fee } = calculateFinalPrice(selectedBatch);

      const { data, error } = await supabase.from("tickets").insert({
        event_id: eventId,
        batch_id: selectedBatch.id,
        user_id: userId,
        guest_name: guestName.trim(),
        cpf: cpf.replace(/\D/g, ""), // Store only digits
        paid_price_cents: selectedBatch.price_cents,
        paid_fee_cents: fee,
        status: "valid"
      }).select().single();

      if (error) throw error;

      closeModal();
      alert("Ingresso garantido! Veja em 'Meus Ingressos'.");
      router.refresh();
      router.push("/dashboard/tickets");

    } catch (error) {
      console.error(error);
      alert("Erro ao processar compra.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <TicketIcon size={20} className="text-red-primary"/>
        Ingressos Disponíveis
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        {batches.map((batch) => {
          const pricing = calculateFinalPrice(batch);
          const isSoldOut = batch.sold_quantity >= batch.total_quantity;
          const isDisabled = !batch.is_active || isSoldOut;

          return (
            <div 
              key={batch.id} 
              className={`border rounded-xl p-5 transition-all ${
                isDisabled ? "opacity-60 bg-gray-50 border-gray-200" : "bg-white border-gray-200 hover:border-red-primary shadow-sm hover:shadow-md"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-gray-800">{batch.name}</h4>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    isSoldOut ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}>
                    {isSoldOut ? "ESGOTADO" : "Disponível"}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-primary">
                    {formatCurrency(pricing.total)}
                  </p>
                  <p className="text-xs text-gray-500">
                    ({formatCurrency(pricing.base)} + {formatCurrency(pricing.fee)} tx)
                  </p>
                </div>
              </div>

              <button
                onClick={() => openCheckoutModal(batch)}
                disabled={isDisabled || loading}
                className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white font-medium rounded-lg disabled:cursor-not-allowed disabled:bg-gray-300 flex justify-center items-center transition"
              >
                {loading === batch.id ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  "Comprar Agora"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Checkout Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-900">Finalizar Compra</h3>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Ingresso</p>
                <p className="font-semibold text-gray-900">{selectedBatch.name}</p>
                <p className="text-lg font-bold text-red-primary mt-1">
                  {formatCurrency(calculateFinalPrice(selectedBatch).total)}
                </p>
              </div>

              {/* Guest Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  Nome completo do participante
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-primary/50 ${
                    errors.guestName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.guestName && (
                  <p className="text-red-500 text-sm mt-1">{errors.guestName}</p>
                )}
              </div>

              {/* CPF */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <CreditCard className="w-4 h-4 inline mr-1" />
                  CPF do participante
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-primary/50 ${
                    errors.cpf ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.cpf && (
                  <p className="text-red-500 text-sm mt-1">{errors.cpf}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Usado para validação na entrada do evento
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-red-primary hover:bg-red-700 text-white font-medium rounded-lg disabled:bg-gray-300 flex justify-center items-center transition"
              >
                {loading ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  "Confirmar Compra"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
    </div>
  );
}