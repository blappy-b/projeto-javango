"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Loader2, AlertCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

export default function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [sent, setSent] = useState(false);

  const supabase = createSupabaseBrowser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError(null);

    try {
      // O link do e-mail passa por /auth/confirm, que valida o token,
      // cria a sessão temporária e redireciona para /redefinir-senha.
      const redirectTo = `${window.location.origin}/auth/confirm?next=/redefinir-senha`;

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo,
      });

      // Limite de envios atingido: avisamos o usuário.
      if (error?.status === 429) {
        setServerError(
          "Muitas tentativas. Aguarde alguns minutos e tente novamente."
        );
        return;
      }

      // Para qualquer outro caso mostramos a mesma mensagem de sucesso,
      // para não revelar quais e-mails estão cadastrados.
      if (error) console.error(error);
      setSent(true);
    } catch (error) {
      console.error(error);
      setServerError("Não foi possível enviar o e-mail. Tente novamente.");
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
        <h1 className="text-2xl font-bold text-dark-gray">Esqueci minha senha</h1>
        <p className="text-gray-500 mt-2">
          Informe seu e-mail e enviaremos um link para criar uma nova senha
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col items-center gap-3 p-4 bg-green-50 text-green-800 rounded-lg text-sm text-center">
          <MailCheck size={28} />
          <p>
            Se o e-mail estiver cadastrado, você receberá em instantes um link
            para redefinir sua senha. Confira também a caixa de spam.
          </p>
        </div>
      ) : (
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
              <p className="text-red-primary text-sm mt-1">{errors.email.message}</p>
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
            {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Enviar link"}
          </button>
        </form>
      )}

      <div className="text-center text-sm text-gray-600">
        Lembrou a senha?{" "}
        <Link href="/login" className="text-red-primary font-bold hover:underline">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
