"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MoreHorizontal, Edit, Trash2, Loader2, Eye } from "lucide-react";
import { deleteEventAction } from "@/actions/events";

export default function EventActions({ eventId }) {
  const btnRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const handleDelete = async () => {
    const confirm = window.confirm("Tem certeza? Essa ação não pode ser desfeita.");
    if (!confirm) return;

    setIsDeleting(true);
    const res = await deleteEventAction(eventId);

    if (res?.error) alert(res.error);

    setIsDeleting(false);
    setIsOpen(false);
  };

  // calcula posição do dropdown quando abre + quando scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.right, width: r.width }); // right aligned
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setIsOpen((v) => !v)}
        className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
      >
        {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <MoreHorizontal size={20} />}
      </button>

      {isOpen &&
        createPortal(
          <>
            {/* Overlay: não cria scroll e fica acima de tudo */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <div
              className="fixed z-[9999] w-56 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden"
              style={{
                top: pos.top,
                left: pos.left,
                transform: "translateX(-100%)", // alinhar pela direita do botão
              }}
            >
              <Link
                href={`/events/${eventId}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <Eye size={16} /> Ver Página Pública
              </Link>

              <Link
                href={`/admin/events/${eventId}/edit`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                onClick={() => setIsOpen(false)}
              >
                <Edit size={16} /> Editar Evento
              </Link>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left disabled:opacity-60"
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
