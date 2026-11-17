"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase";

const resetSchema = z
  .object({
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export default function ResetPasswordForm() {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowser());
  const [hasSession, setHasSession] = useState(null); // null = verificando
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetSchema) });

  useEffect(() => {
    // O link do e-mail passa por /auth/confirm, que já cria a sessão.
    supabase.auth.getUser().then(({ data }) => setHasSession(Boolean(data?.user)));
  }, [supabase]);

  const onSubmit = async ({ password }) => {
    setIsLoading(true);
    setServerError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setServerError(
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da anterior."
          : "Não foi possível alterar a senha. Peça um novo link e tente de novo."
      );
      setIsLoading(false);
      return;
    }

    setDone(true);
    setIsLoading(false);
    router.refresh();
    setTimeout(() => router.push("/"), 2000);
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-50 p-3 rounded-full text-red-primary">
            {done ? <CheckCircle2 size={32} /> : <KeyRound size={32} />}
          </div>
        </div>
        <h1 className="text-2xl font-bold text-dark-gray">
          {done ? "Senha alterada!" : "Criar nova senha"}
        </h1>
        {done && <p className="text-gray-500 mt-2">Você já está conectado. Redirecionando…</p>}
      </div>

      {hasSession === null && !done && (
        <div className="flex justify-center text-gray-400">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {hasSession === false && !done && (
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Este link expirou ou não é válido. Peça um novo para redefinir sua senha.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block py-3 px-4 bg-red-primary text-white font-bold rounded-lg"
          >
            Pedir novo link
          </Link>
        </div>
      )}

      {hasSession && !done && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <input
              {...register("password")}
              type="password"
              autoComplete="new-password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary outline-none transition"
              placeholder="******"
            />
            {errors.password && (
              <p className="text-red-primary text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
            <input
              {...register("confirmPassword")}
              type="password"
              autoComplete="new-password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary outline-none transition"
              placeholder="******"
            />
            {errors.confirmPassword && (
              <p className="text-red-primary text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <div className="flex items-center gap-2 p-3 text-red-primary rounded-lg text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-red-primary hover:bg-red-primary text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Salvar nova senha"}
          </button>
        </form>
      )}
    </div>
  );
}
