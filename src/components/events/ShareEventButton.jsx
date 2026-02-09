"use client";

import { useMemo, useState } from "react";
import { Share2, Check, Copy, AlertCircle } from "lucide-react";

function formatPtBrDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} às ${time}`;
}

export default function ShareEventButton({ eventId, title, location, startDate, className }) {
  const [status, setStatus] = useState("idle"); // idle | copied | error

  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URL(`/events/${eventId}`, window.location.origin).toString();
  }, [eventId]);

  const text = useMemo(() => {
    const parts = [
      `🎟️ ${title}`,
      formatPtBrDateTime(startDate),
      location ? `📍 ${location}` : "",
      url,
    ].filter(Boolean);

    return parts.join("\n");
  }, [title, startDate, location, url]);

  const resetLater = () => {
    window.setTimeout(() => setStatus("idle"), 2500);
  };

  const handleShare = async () => {
    try {
      // 1) Se tiver Web Share API (geralmente mobile)
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      // 2) Fallback: copia pro clipboard (por padrão vou copiar o LINK)
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
        resetLater();
        return;
      }

      // 3) Fallback bem antigo (quase nunca necessário hoje)
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);

      if (!ok) throw new Error("Falha ao copiar");
      setStatus("copied");
      resetLater();
    } catch (err) {
      console.error(err);
      setStatus("error");
      resetLater();
    }
  };

  const Icon = status === "copied" ? Check : status === "error" ? AlertCircle : Share2;

  const label =
    status === "copied"
      ? "Link copiado!"
      : status === "error"
      ? "Não foi possível compartilhar"
      : "Compartilhar evento";

  return (
    <button
      type="button"
      onClick={handleShare}
      className={
        className ??
        "w-full mt-4 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-900 py-2 transition text-sm"
      }
      aria-label="Compartilhar evento"
    >
      <Icon size={16} />
      {label}

      {status === "idle" && typeof window !== "undefined" && !navigator.share && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
          <Copy size={12} />
          copiar link
        </span>
      )}
    </button>
  );
}
