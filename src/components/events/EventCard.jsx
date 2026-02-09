import Link from 'next/link'
import { Calendar, MapPin } from 'lucide-react'
import Image from 'next/image'

export default function EventCard({ event }) {
  // Formatação de data simples
  const date = new Date(event.start_date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
  })

  return (
    <Link 
          href={`/events/${event.id}`} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 flex flex-col h-full">
      {/* Área da Imagem (Placeholder se não tiver) */}
      <div className="h-48 bg-linear-to-r from-red-primary to-dark-gray flex items-center justify-center text-white">
        {event.image_url ? (
          <Image src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : null}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
        
        <div className="space-y-2 mb-4 flex-1">
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar size={16} className="mr-2" />
            {date}
          </div>
          <div className="flex items-center text-gray-500 text-sm">
            <MapPin size={16} className="mr-2" />
            {event.location || 'Local a definir'}
          </div>
        </div>

      </div>
    </Link>
  )
}