"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";
import { QrCode, LogOut, Loader2 } from "lucide-react";
import { DebugProvider } from "@/components/debug/MobileDebugger";

export default function StaffLayout({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [assignedEvents, setAssignedEvents] = useState([]);
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

        // Check if user is staff or admin
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

        // Fetch assigned events for this staff
        const { data: assignments } = await supabase
          .from("staff_assignments")
          .select(`
            event_id,
            events (
              id,
              title,
              start_date
            )
          `)
          .eq("staff_id", user.id);

        setAssignedEvents(assignments?.map(a => a.events).filter(Boolean) || []);
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
    <DebugProvider enabled={true}>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode className="w-6 h-6 text-red-primary" />
            <div>
              <h1 className="font-bold text-lg">Scanner</h1>
              <p className="text-xs text-gray-400">Javango Staff</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Pass assigned events to children via context/props */}
        <main className="p-4">
          {typeof children === "function" 
            ? children({ assignedEvents, user })
            : children
          }
        </main>
      </div>
    </DebugProvider>
  );
}
