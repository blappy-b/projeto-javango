'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

// 1. Schema de Validação (Zod)
const registerSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export default function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  })

  // 2. Função de Envio
  const onSubmit = async (data) => {
    setIsLoading(true)
    setServerError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          // O "pulo do gato": isso vai para o meta_data e o Trigger SQL captura!
          data: {
            full_name: data.fullName, 
          },
        },
      })

      if (error) {
        throw error
      }

      setSuccess(true)
      
      // Se você desativou a confirmação de email no Supabase, 
      // pode redirecionar direto:
      // router.push('/admin') 

    } catch (error) {
      setServerError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // 3. Tela de Sucesso (Verifique seu email)
  // if (success) {
  //   return (
  //     <div className="flex flex-col items-center justify-center space-y-4 text-center p-6 bg-green-50 rounded-lg border border-green-200">
  //       <CheckCircle className="h-12 w-12 text-green-600" />
  //       <h2 className="text-2xl font-bold text-green-800">Conta Criada!</h2>
  //       <p className="text-green-700">
  //         Enviamos um link de confirmação para o seu email. <br />
  //         Por favor, verifique sua caixa de entrada (e spam) para ativar a conta.
  //       </p>
  //       <Link href="/login" className="text-green-800 font-bold underline mt-4">
  //         Ir para Login
  //       </Link>
  //     </div>
  //   )
  // }
  // router.refresh()

  // 4. Formulário
  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-dark-gray">Crie sua conta</h1>
        <p className="text-gray-500 mt-2">Comece a comprar ingressos agora</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome Completo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
          <input
            {...register('fullName')}
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary focus:border-red-primary outline-none transition"
            placeholder="Ex: João Silva"
          />
          {errors.fullName && <p className="text-red-primary text-sm mt-1">{errors.fullName.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            {...register('email')}
            type="email"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary focus:border-red-primary outline-none transition"
            placeholder="seu@email.com"
          />
          {errors.email && <p className="text-red-primary text-sm mt-1">{errors.email.message}</p>}
        </div>

        {/* Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <input
            {...register('password')}
            type="password"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary focus:border-red-primary outline-none transition"
            placeholder="******"
          />
          {errors.password && <p className="text-red-primary text-sm mt-1">{errors.password.message}</p>}
        </div>

        {/* Mensagem de Erro do Servidor */}
        {serverError && (
          <div className="flex items-center gap-2 p-3 bg-red-primary text-red-primary rounded-lg text-sm">
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-red-primary hover:bg-red-primary text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Criar Conta'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-600">
        Já tem uma conta?{' '}
        <Link href="/login" className="text-red-primary font-bold hover:underline">
          Fazer Login
        </Link>
      </div>
    </div>
  )
}