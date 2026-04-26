"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createSupabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, LogIn } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (authError) throw authError;

      // --- NOVA LÓGICA DE REDIRECIONAMENTO ---

      // 1. Buscamos a role do usuário recém logado
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      router.refresh(); // Atualiza contexto do Next.js

      // 2. Redireciona baseado na Role
      if (profile?.role === "admin") {
        router.push("/admin"); // Vai para o Dashboard
      } else if (profile?.role === "staff") {
        router.push("/staff"); // Vai para o Scanner
      } else {
        router.push("/"); // Alunos vão para a Home/Vitrine
      }
    } catch (error) {
      console.error(error);
      setServerError("Email ou senha incorretos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-primary p-3 rounded-full">
            <LogIn className="w-8 h-8 text-red-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-dark-gray">
          Bem-vindo de volta
        </h1>
        <p className="text-gray-500 mt-2">Acesse sua conta para continuar</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            {...register("email")}
            type="email"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary outline-none transition"
            placeholder="seu@email.com"
          />
          {errors.email && (
            <p className="text-red-primary text-sm mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Senha
          </label>
          <input
            {...register("password")}
            type="password"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary outline-none transition"
            placeholder="******"
          />
          {errors.password && (
            <p className="text-red-primary text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {serverError && (
          <div className="flex items-center gap-2 p-3 text-red-primary rounded-lg text-sm">
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-red-primary hover:bg-red-primary text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Entrar"}
        </button>
      </form>

      <div className="text-center text-sm text-gray-600">
        Não tem uma conta?{" "}
        <Link
          href="/register"
          className="text-red-primary font-bold hover:underline"
        >
          Cadastre-se
        </Link>
      </div>
    </div>
  );
}
