import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata = {
  title: 'Esqueci minha senha | Javango Jango',
}

export default async function ForgotPasswordPage({ searchParams }) {
  const params = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <ForgotPasswordForm linkError={params?.error === 'link'} />
    </main>
  )
}
