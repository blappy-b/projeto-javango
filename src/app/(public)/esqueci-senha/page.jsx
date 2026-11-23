import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata = {
  title: 'Esqueci minha senha | Javango Jango',
}

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <ForgotPasswordForm />
    </main>
  )
}
