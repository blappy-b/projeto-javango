"use client";

import { RefreshCw } from "lucide-react";

export default function RefreshButton() {
  return (
    <button 
      onClick={() => window.location.reload()}
      className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-full transition"
      title="Atualizar página"
    >
      <RefreshCw size={18} />
    </button>
  );
}
