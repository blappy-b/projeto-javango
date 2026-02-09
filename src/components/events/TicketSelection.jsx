"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Ticket,
  Plus,
  Minus,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, calculateFinalPrice } from "@/utils/price";
import { buyTicketsBulkAction } from "@/actions/tickets";

export default function TicketSelection({ eventId, batches }) {
  const [cart, setCart] = useState({}); // { batchId: quantity }
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  // Função para atualizar quantidade
  const updateQuantity = (batchId, delta, maxAvailable) => {
    setCart((prev) => {
      const currentQty = prev[batchId] || 0;
      const newQty = currentQty + delta;

      // Validações
      if (newQty < 0) return prev;
      if (newQty > maxAvailable) return prev; // Não deixa passar do estoque

      // Se for 0, remove do objeto cart para limpar
      if (newQty === 0) {
        const newCart = { ...prev };
        delete newCart[batchId];
        return newCart;
      }

      return { ...prev, [batchId]: newQty };
    });
  };

  // Calcula totais
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const totalPrice = Object.entries(cart).reduce((acc, [batchId, qty]) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return acc;
    const { total } = calculateFinalPrice(batch); // Preço total (base + taxa)
    return acc + total * qty;
  }, 0);

  // Finalizar Compra
  // Dentro de TicketSelection.jsx

  const handleCheckout = async () => {
    setIsProcessing(true);

    const cartItems = Object.entries(cart).map(([batchId, quantity]) => ({
      batchId,
      quantity,
    }));

    const result = await buyTicketsBulkAction(eventId, cartItems);

    if (result?.error === "unauthenticated") {
      router.push(`/login?next=/events/${eventId}`);
      return;
    }

    if (result?.redirectUrl) {
      // Redireciona o usuário para o Mercado Pago
      window.location.href = result.redirectUrl;
    } else {
      alert(result?.error || "Erro desconhecido");
      setIsProcessing(false);
    }
  };

  // Filtra apenas lotes ativos
  const activeBatches = batches.filter((b) => b.is_active);

  return (
    <>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Ticket className="text-red-primary" />
          Selecione seus Ingressos
        </h3>

        <div className="space-y-6">
          {activeBatches.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
              Nenhum ingresso disponível.
            </div>
          ) : (
            activeBatches.map((batch) => {
              const pricing = calculateFinalPrice(batch);
              console.log(batch)
              const available = batch.total_quantity - batch.sold_quantity;
              const isSoldOut = available <= 0;
              const currentQty = cart[batch.id] || 0;

              console.log(pricing)

              return (
                <div
                  key={batch.id}
                  className={`border-b border-gray-100 last:border-0 pb-6 last:pb-0 ${
                    isSoldOut ? "opacity-50 grayscale" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg">
                        {batch.name}
                      </h4>
                      {/* Badge de Escassez */}
                      {!isSoldOut && available < 10 && (
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          Restam apenas {available}!
                        </span>
                      )}
                      {isSoldOut && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          Esgotado
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(pricing.total)}
                      </p>
                      {/* Mostramos o total de taxas somadas para não confundir o aluno */}
                      <p
                        className="text-xs text-gray-400"
                        title="Taxa de serviço + Processamento"
                      >
                        (+ {formatCurrency(pricing.totalFee)} taxas)
                      </p>
                    </div>
                  </div>

                  {/* Controles de Quantidade */}
                  <div className="flex items-center justify-end gap-3 mt-3">
                    <button
                      onClick={() => updateQuantity(batch.id, -1, available)}
                      disabled={currentQty === 0 || isSoldOut || isProcessing}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <Minus size={16} />
                    </button>

                    <span className="w-8 text-center font-bold text-lg text-gray-800">
                      {currentQty}
                    </span>

                    <button
                      onClick={() => updateQuantity(batch.id, 1, available)}
                      disabled={
                        currentQty >= available || isSoldOut || isProcessing
                      }
                      className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Checkout Bar (Só aparece se tiver itens no carrinho) */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-primary p-3 rounded-full text-red-primary relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total a pagar</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">
                  {formatCurrency(totalPrice)}
                </p>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="w-full sm:w-auto px-8 py-3 bg-red-primary hover:brightness-110 text-white font-bold rounded-xl shadow-lg shadow-red-primary transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" /> Processando...
                </>
              ) : (
                "Finalizar Compra"
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
