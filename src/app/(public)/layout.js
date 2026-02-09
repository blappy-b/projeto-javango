import { Inter } from "next/font/google";
import Navbar from "@/components/layout/Navbar"; // Já vamos criar
import Sidebar from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Javango Jango - Eventos",
  description: "Sistema de venda de ingressos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {/* Navbar Pública aparece em tudo, exceto se sobrescrevermos no layout do admin */}
        <Navbar />
        {children}
      </body>
    </html>
  );
}
