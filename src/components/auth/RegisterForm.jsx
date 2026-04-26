'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

// Função para validar CPF
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cpf)) return false
  
  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(9))) return false
  
  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(10))) return false
  
  return true
}

// Função para formatar CPF
function formatarCPF(valor) {
  return valor
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

// 1. Schema de Validação (Zod)
const registerSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string()
    .min(14, 'CPF inválido')
    .refine((cpf) => validarCPF(cpf), { message: 'CPF inválido' }),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string().min(1, 'Confirme sua senha'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
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
      // Verifica se o CPF já está cadastrado
      const cpfLimpo = data.cpf.replace(/\D/g, '')
      const { data: cpfDisponivel, error: cpfError } = await supabase
        .rpc('check_cpf_available', { cpf_input: cpfLimpo })
      
      if (cpfError) {
        throw new Error('Erro ao verificar CPF. Tente novamente.')
      }
      
      if (!cpfDisponivel) {
        throw new Error('Este CPF já está vinculado a outra conta.')
      }

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          // O "pulo do gato": isso vai para o meta_data e o Trigger SQL captura!
          data: {
            full_name: data.fullName,
            cpf: cpfLimpo, // Salva apenas os números
          },
        },
      })

      if (error) {
        throw error
      }

      setSuccess(true)
      
      // Redireciona para o login após 2 segundos
      setTimeout(() => {
        router.push('/login')
      }, 2000) 

    } catch (error) {
      setServerError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // 3. Tela de Sucesso
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 text-center p-6 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle className="h-12 w-12 text-green-600" />
        <h2 className="text-2xl font-bold text-green-800">Conta Criada!</h2>
        <p className="text-green-700">
          Sua conta foi criada com sucesso! <br />
          Você será redirecionado para o login em instantes...
        </p>
        <Link href="/login" className="text-green-800 font-bold underline mt-4">
          Ir para Login agora
        </Link>
      </div>
    )
  }

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

        {/* CPF */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
          <input
            {...register('cpf', {
              onChange: (e) => {
                e.target.value = formatarCPF(e.target.value)
              }
            })}
            type="text"
            maxLength={14}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary focus:border-red-primary outline-none transition"
            placeholder="000.000.000-00"
          />
          {errors.cpf && <p className="text-red-primary text-sm mt-1">{errors.cpf.message}</p>}
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

        {/* Confirmar Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
          <input
            {...register('confirmPassword')}
            type="password"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-primary focus:border-red-primary outline-none transition"
            placeholder="******"
          />
          {errors.confirmPassword && <p className="text-red-primary text-sm mt-1">{errors.confirmPassword.message}</p>}
        </div>

        {/* Mensagem de Erro do Servidor */}
        {serverError && (
          <div className="flex items-center gap-2 p-3 text-red-primary rounded-lg text-sm">
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