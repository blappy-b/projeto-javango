import RegisterForm from '@/components/auth/RegisterForm'

export const metadata = {
  title: 'Cadastro | Javango Jango',
  description: 'Crie sua conta para comprar ingressos',
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <RegisterForm />
    </main>
  )
}