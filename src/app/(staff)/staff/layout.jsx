"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Ticket, LogOut, Loader2 } from "lucide-react";

export default function StaffLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
          router.replace("/");
          return;
        }

        setUser(user);
      } catch (error) {
        console.error("Auth error:", error);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50 px-4 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-primary/10 flex items-center justify-center">
            <Ticket className="w-5 h-5 text-red-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Staff Portal</h1>
            <p className="text-xs text-gray-400">Validação de Ingressos</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main>{children}</main>
    </div>
  );
}
