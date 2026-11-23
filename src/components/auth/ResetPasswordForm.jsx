"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createSupabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const resetSchema = z
  .object({
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export default function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  // null = verificando, true = link válido, false = link inválido/expirado
  const [hasSession, setHasSession] = useState(null);

  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
  });

  // A sessão de recuperação é criada em /auth/confirm antes de chegar aqui.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data?.user));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        if (error.code === "same_password") {
          setServerError("A nova senha deve ser diferente da senha atual.");
        } else if (error.code === "weak_password") {
          setServerError("Senha muito fraca. Escolha uma senha mais forte.");
        } else {
          throw error;
        }
        return;
      }

      // Encerra a sessão de recuperação e manda para o login com a nova senha.
      await supabase.auth.signOut();
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 2500);
    } catch (error) {
      console.error(error);
      setServerError("Não foi possível alterar a senha. Solicite um novo link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-50 p-3 rounded-full">
            <Image src="/mascote.png" width={32} height={32} alt="Logo" className="w-12 h-12" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-dark-gray">Criar nova senha</h1>
      </div>

      {hasSession === null && (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      )}

      {hasSession === false && (
        <div className="space-y-4 text-center">
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-primary rounded-lg text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>
              Este link é inválido ou expirou. Solicite um novo link de
              redefinição de senha.
            </span>
          </div>
          <Link
            href="/esqueci-senha"
            className="inline-block text-red-primary font-bold hover:underline text-sm"
          >
            Solicitar novo link
          </Link>
        </div>
      )}

      {hasSession && success && (
        <div className="flex flex-col items-center gap-3 p-4 bg-green-50 text-green-800 rounded-lg text-sm text-center">
          <CheckCircle2 size={28} />
          <p>Senha alterada com sucesso! Redirecionando para o login...</p>
        </div>
      )}

      {hasSession && !success && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova senha
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar nova senha
            </label>
            <input
              {...register("confirmPassword")}
              type="password"
              autoComplete="new-password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary outline-none transition"
              placeholder="******"
            />
            {errors.confirmPassword && (
              <p className="text-red-primary text-sm mt-1">
                {errors.confirmPassword.message}
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
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Salvar nova senha"}
          </button>
        </form>
      )}
    </div>
  );
}
