"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase";
import { 
  Ticket, 
  QrCode, 
  Music, 
  Users, 
  LogOut, 
} from "lucide-react";

// Configuração centralizada do Menu
// Basta adicionar itens aqui para crescer a aplicação
const MENU_ITEMS = [
  // --- Contexto do ALUNO (Student) ---
  {
    label: "Eventos (Vitrine)",
    path: "/events", // Refere-se a (student)/events
    icon: Music,
    allowedRoles: ["student", "admin"], // Admin também pode ver como ficou
  },
  {
    label: "Meus Ingressos",
    path: "/my-tickets", // Refere-se a (student)/my-tickets
    icon: Ticket,
    allowedRoles: ["student"],
  },
  
  // --- Contexto do STAFF (Scanner) ---
  {
    label: "Scanner QR",
    path: "/staff", // Refere-se a (staff)/staff
    icon: QrCode,
    allowedRoles: ["staff", "admin"],
  },
  
  // --- Contexto do ADMIN (Gestão) ---
  {
    label: "Gestão de Eventos",
    path: "/admin/events", // Refere-se a (admin)/admin/events
    icon: LayoutDashboard,
    allowedRoles: ["admin"],
  },
  {
    label: "Financeiro",
    path: "/admin/sales", // Refere-se a (admin)/admin/sales
    icon: Settings, // ou DollarSign
    allowedRoles: ["admin"],
  }
];

export default function Sidebar() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 1. Pega o usuário da sessão atual
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/login");
          return;
        }

        setUserEmail(user.email);

        // 2. Busca a ROLE na tabela profiles
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile) {
          setRole(profile.role);
        } else {
          // Fallback seguro se não achar perfil
          setRole("student"); 
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  // Renderização do Loading (Skeleton simples) para evitar layout shift agressivo
  if (loading) {
    return (
      <aside className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col p-6">
         <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-8" />
         <div className="space-y-4">
           {[1, 2, 3].map((i) => (
             <div key={i} className="h-10 w-full bg-gray-100 rounded animate-pulse" />
           ))}
         </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col sticky top-0 left-0 overflow-y-auto shadow-sm z-30">
      
      {/* Header da Sidebar */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-red-primary rounded-lg flex items-center justify-center text-white font-bold">
            M
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">MusicEvent</span>
        </div>
        
        {/* Badge da Role */}
        <div className="mt-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500 font-medium truncate" title={userEmail}>
            {userEmail}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`w-2 h-2 rounded-full ${
              role === 'admin' ? 'bg-purple-500' : 
              role === 'staff' ? 'bg-blue-500' : 'bg-green-500'
            }`} />
            <span className="text-xs font-bold uppercase text-gray-600 tracking-wide">
              {role === 'admin' ? 'Administrador' : role}
            </span>
          </div>
        </div>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 px-4 space-y-1">
        <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">
          Menu Principal
        </p>

        {MENU_ITEMS.map((item) => {
          // LÓGICA CORE: Se a role do usuário não estiver na lista permitida, não renderiza
          if (!item.allowedRoles.includes(role)) return null;

          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-red-primary text-red-primary"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon 
                size={18} 
                className={`${isActive ? "text-red-primary" : "text-gray-400 group-hover:text-gray-600"}`} 
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-100 mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
        >
          <LogOut size={18} className="text-gray-400 group-hover:text-red-500 transition-colors" />
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}