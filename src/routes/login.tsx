import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminLoginForm } from '#/components/admin-login-form'
import { getCurrentAdminSession } from '#/server/admin/session'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ search }) => {
    const session = await getCurrentAdminSession()

    if (session?.user) {
      throw redirect({ to: safeRedirectPath(search.redirect) })
    }
  },
  component: LoginPage,
  head: () => ({
    meta: [
      {
        title: '后台登录',
      },
    ],
  }),
  validateSearch: (
    search: Record<string, string | undefined>,
  ): { redirect?: string } => ({
    redirect: search.redirect?.startsWith('/admin')
      ? search.redirect
      : undefined,
  }),
})

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch()

  return (
    <main className='admin-shell fixed inset-0 bg-background text-foreground'>
      <div className='grid h-full place-items-center bg-background px-4'>
        <AdminLoginForm redirectTo={redirectTo} />
      </div>
    </main>
  )
}

function safeRedirectPath(value: string | undefined) {
  return value?.startsWith('/admin') ? value : '/admin'
}
