"use client";

import { useState } from "react";
import { Loader2, Ticket as TicketIcon } from "lucide-react";
import { formatCurrency, calculateFinalPrice } from "@/utils/price";
import { createSupabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function EventPurchase({ eventId, batches, userId }) {
  const [loading, setLoading] = useState(null); // ID do lote sendo comprado
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const handlePurchase = async (batch) => {
    setLoading(batch.id);
    
    try {
      const { total, fee } = calculateFinalPrice(batch);

      // AQUI ENTRARIA O GATEWAY DE PAGAMENTO (Stripe/MercadoPago)
      // Como é "custo zero/MVP", vamos simular aprovacao imediata:
      
      const { data, error } = await supabase.from("tickets").insert({
        event_id: eventId,
        batch_id: batch.id,
        user_id: userId,
        paid_price_cents: batch.price_cents,
        paid_fee_cents: fee,
        status: "valid"
      }).select().single();

      if (error) throw error;

      alert("Ingresso garantido! Veja em 'Meus Ingressos'.");
      router.refresh();
      router.push("/dashboard/tickets"); // Redireciona para a lista

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
          // Lógica de Preço
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
                onClick={() => handlePurchase(batch)}
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
    </div>
  );
}