"use client";

import QRCode from "react-qr-code";
import { Calendar, MapPin, Clock, Ticket as TicketIcon } from "lucide-react";

export default function TicketCard({ ticket, event }) {
  // Formatações de data
  const startDate = new Date(event.start_date);
  const dateStr = startDate.toLocaleDateString('pt-BR', { 
    day: '2-digit', month: 'long', year: 'numeric' 
  });
  const timeStr = startDate.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', minute: '2-digit' 
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col md:flex-row">
      
      {/* Lado Esquerdo: QR Code (Área de validação) */}
      <div className="bg-slate-900 p-6 flex flex-col items-center justify-center text-white md:w-64 shrink-0 relative">
        <div className="bg-white p-2 rounded-lg mb-4">
          <QRCode 
            value={ticket.id} // O QR Code contém APENAS o ID do ingresso
            size={140}
            level="M" 
          />
        </div>
        <p className="text-xs font-mono text-gray-400 opacity-80 break-all text-center max-w-[180px]">
          {ticket.id.slice(0, 8)}...
        </p>
        
        {/* Status Badge */}
        <div className={`mt-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          ticket.status === 'valid' ? 'bg-green-500 text-white' : 
          ticket.status === 'used' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
        }`}>
          {ticket.status === 'valid' ? 'Válido' : 
           ticket.status === 'used' ? 'Utilizado' : 'Cancelado'}
        </div>

        {/* Decoração de "picote" do ingresso */}
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full hidden md:block" />
      </div>

      {/* Lado Direito: Infos do Evento */}
      <div className="p-6 flex-1 flex flex-col justify-between relative">
        {/* Picote mobile */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-50 rounded-full md:hidden" />

        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
            {event.title}
          </h3>
          
          <div className="space-y-3 mt-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar size={18} className="text-red-primary" />
              <span className="text-sm font-medium">{dateStr}</span>
            </div>
            
            <div className="flex items-center gap-3 text-gray-600">
              <Clock size={18} className="text-red-primary" />
              <span className="text-sm font-medium">{timeStr}</span>
            </div>

            <div className="flex items-start gap-3 text-gray-600">
              <MapPin size={18} className="text-red-primary mt-0.5" />
              <span className="text-sm font-medium">{event.location}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between items-end">
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Tipo de Ingresso</p>
            <div className="flex items-center gap-2">
              <TicketIcon size={16} className="text-slate-900" />
              <span className="font-bold text-slate-900">
                {ticket.ticket_batches?.name || "Ingresso Padrão"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}