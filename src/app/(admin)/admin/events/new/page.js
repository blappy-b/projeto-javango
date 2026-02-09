import CreateEventForm from "@/components/admin/CreateEventForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/events" 
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Evento</h1>
          <p className="text-gray-500 text-sm">Preencha os dados para começar a vender.</p>
        </div>
      </div>

      <CreateEventForm />
    </div>
  );
}