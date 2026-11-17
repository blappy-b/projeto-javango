"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, MailCheck, KeyRound } from "lucide-react";
import { requestPasswordResetAction } from "@/actions/auth";
import { formatCpf, isValidCpf } from "@/utils/cpf";

export default function ForgotPasswordForm({ linkError = false }) {
  const [cpf, setCpf] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    linkError ? "O link expirou ou já foi usado. Peça um novo abaixo." : null
  );
  const [sentTo, setSentTo] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isValidCpf(cpf)) {
      setError("CPF inválido.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestPasswordResetAction(cpf);
      if (result?.error) {
        setError(result.error);
      } else {
        setSentTo(result.maskedEmail);
      }
    } catch {
      setError("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-50 p-3 rounded-full text-red-primary">
            {sentTo ? <MailCheck size={32} /> : <KeyRound size={32} />}
          </div>
        </div>
        <h1 className="text-2xl font-bold text-dark-gray">
          {sentTo ? "Confira seu e-mail" : "Esqueci minha senha"}
        </h1>
        <p className="text-gray-500 mt-2">
          {sentTo ? (
            <>
              Enviamos um link para <strong>{sentTo}</strong>. Abra o e-mail e
              clique no link para criar uma nova senha. Se não encontrar, olhe a
              caixa de spam.
            </>
          ) : (
            "Informe o CPF da sua conta e enviaremos um link para o e-mail cadastrado."
          )}
        </p>
      </div>

      {!sentTo && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF
            </label>
            <input
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              inputMode="numeric"
              autoComplete="off"
              maxLength={14}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary outline-none transition"
              placeholder="000.000.000-00"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-red-primary rounded-lg text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
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

      {sentTo && (
        <button
          type="button"
          onClick={() => setSentTo(null)}
          className="w-full text-sm text-gray-600 hover:underline"
        >
          Não recebeu? Enviar de novo
        </button>
      )}

      <div className="text-center text-sm text-gray-600">
        Lembrou a senha?{" "}
        <Link href="/login" className="text-red-primary font-bold hover:underline">
          Entrar
        </Link>
      </div>
    </div>
  );
}
