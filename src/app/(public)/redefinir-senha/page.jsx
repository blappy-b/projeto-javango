import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export const metadata = {
  title: 'Redefinir senha | Javango Jango',
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <ResetPasswordForm />
    </main>
  )
}
