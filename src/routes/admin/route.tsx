import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
import {
  Building2,
  FolderOpen,
  Images,
  Loader2,
  Tags,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { cn } from '#/lib/utils'
import { orpc } from '#/orpc/client'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
  head: () => ({
    meta: [
      {
        title: '图片管理后台',
      },
    ],
  }),
})

function AdminLayout() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <AdminFrame>
        <div className='flex h-full items-center justify-center'>
          <Loader2 className='size-7 animate-spin text-[#73e0d3]' />
        </div>
      </AdminFrame>
    )
  }

  if (!session?.user) {
    return (
      <AdminFrame>
        <AdminSignIn />
      </AdminFrame>
    )
  }

  return (
    <AdminFrame>
      <div className='grid h-full grid-cols-[248px_minmax(0,1fr)] overflow-hidden max-lg:grid-cols-[72px_minmax(0,1fr)]'>
        <AdminSidebar userEmail={session.user.email} />
        <Outlet />
      </div>
    </AdminFrame>
  )
}

export function AdminFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className='fixed inset-0 bg-[#191b1f] text-[#ebe7df]'>
      {children}
    </main>
  )
}

export function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      className='h-8 rounded-md bg-[#2c302f] px-3 text-[#dfe4dc] text-sm hover:bg-[#383d3a] disabled:opacity-40'
      disabled={disabled}
      onClick={onClick}
      type='button'
    >
      {children}
    </button>
  )
}

export function FieldInput({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <input
      className='h-9 min-w-0 rounded-md border border-[#383a37] bg-[#17181b] px-3 text-sm outline-none placeholder:text-[#777a75] focus:border-[#73e0d3]'
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type='text'
      value={value}
    />
  )
}

export function invalidateAdminQueries(
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>,
) {
  return queryClient.invalidateQueries()
}

function AdminSidebar({ userEmail }: { userEmail: string }) {
  const navigate = useNavigate()
  const { pathname, searchStr } = useLocation()
  const searchParams = new URLSearchParams(searchStr)
  const currentFilter = searchParams.get('filter') ?? 'all'

  const statsQuery = useQuery(
    orpc.admin.stats.queryOptions({ input: {} }),
  )
  const albumsQuery = useQuery(
    orpc.admin.albums.list.queryOptions({
      input: { limit: 200, offset: 0 },
    }),
  )
  const tagsQuery = useQuery(
    orpc.admin.tags.list.queryOptions({
      input: { limit: 200, offset: 0 },
    }),
  )
  const modelsQuery = useQuery(
    orpc.admin.models.list.queryOptions({
      input: { limit: 200, offset: 0 },
    }),
  )
  const agenciesQuery = useQuery(
    orpc.admin.agencies.list.queryOptions({
      input: { limit: 200, offset: 0 },
    }),
  )

  const albums = (albumsQuery.data as { items?: unknown[] } | undefined)?.items ?? []
  const tags = (tagsQuery.data as { items?: unknown[] } | undefined)?.items ?? []
  const models = (modelsQuery.data as { items?: unknown[] } | undefined)?.items ?? []
  const agencies = (agenciesQuery.data as { items?: unknown[] } | undefined)?.items ?? []

  return (
    <aside className='flex min-h-0 flex-col border-[#333331] border-r bg-[#202125]'>
      <div className='flex h-14 items-center gap-3 border-[#333331] border-b px-4 max-lg:justify-center max-lg:px-2'>
        <div className='grid size-9 place-items-center rounded-md bg-[#73e0d3] text-[#151615]'>
          <Images className='size-5' />
        </div>
        <div className='min-w-0 max-lg:hidden'>
          <p className='truncate font-semibold text-sm'>图片管理</p>
          <p className='truncate text-[#a6aaa8] text-xs'>{userEmail}</p>
        </div>
      </div>

      <nav className='flex-1 space-y-5 overflow-y-auto px-3 py-4 max-lg:px-2'>
        <div className='space-y-1'>
          <SidebarButton
            active={pathname === '/admin' && currentFilter === 'all'}
            count={statsQuery.data?.total}
            icon={<Images />}
            label='全部'
            onClick={() => navigate({ to: '/admin', search: { filter: 'all' } })}
          />
          <SidebarButton
            active={pathname === '/admin' && currentFilter === 'untagged'}
            count={statsQuery.data?.untagged}
            icon={<Tags />}
            label='未标签'
            onClick={() =>
              navigate({ to: '/admin', search: { filter: 'untagged' } })
            }
          />
          <SidebarButton
            active={pathname === '/admin' && currentFilter === 'unalbumed'}
            count={statsQuery.data?.unalbumed}
            icon={<FolderOpen />}
            label='未专辑'
            onClick={() =>
              navigate({ to: '/admin', search: { filter: 'unalbumed' } })
            }
          />
        </div>

        <div className='space-y-1 border-[#333331] border-t pt-4'>
          <SidebarButton
            active={pathname === '/admin/albums'}
            count={albums.length}
            icon={<FolderOpen />}
            label='专辑管理'
            onClick={() => navigate({ to: '/admin/albums' })}
          />
          <SidebarButton
            active={pathname === '/admin/tags'}
            count={tags.length}
            icon={<Tags />}
            label='标签管理'
            onClick={() => navigate({ to: '/admin/tags' })}
          />
          <SidebarButton
            active={pathname === '/admin/models'}
            count={models.length}
            icon={<UserRound />}
            label='模特管理'
            onClick={() => navigate({ to: '/admin/models' })}
          />
          <SidebarButton
            active={pathname === '/admin/agencies'}
            count={agencies.length}
            icon={<Building2 />}
            label='机构管理'
            onClick={() => navigate({ to: '/admin/agencies' })}
          />
        </div>
      </nav>
    </aside>
  )
}

function SidebarButton({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean
  count?: number
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-[#c8cbc5] text-sm transition hover:bg-[#2a2b2e] max-lg:justify-center max-lg:px-2',
        active && 'bg-[#343436] text-white',
      )}
      onClick={onClick}
      title={label}
      type='button'
    >
      <span className='[&_svg]:size-4'>{icon}</span>
      <span className='min-w-0 flex-1 truncate max-lg:hidden'>{label}</span>
      {count !== undefined && (
        <span className='text-[#9a9d98] text-xs tabular-nums max-lg:hidden'>
          {count}
        </span>
      )}
    </button>
  )
}

function AdminSignIn() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const result = isSignUp
      ? await authClient.signUp.email({ email, name, password })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (result.error) {
      setError(result.error.message ?? '登录失败')
      return
    }

    window.location.reload()
  }

  return (
    <div className='grid h-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(92,224,198,0.16),transparent_34%),linear-gradient(135deg,#1b1c20,#25211d_55%,#161719)] px-4'>
      <form
        className='w-full max-w-sm rounded-lg border border-[#3a3a36] bg-[#202125]/95 p-5 shadow-2xl'
        onSubmit={submit}
      >
        <div className='mb-5 flex items-center gap-3'>
          <div className='grid size-10 place-items-center rounded-md bg-[#73e0d3] text-[#141515]'>
            <Images className='size-5' />
          </div>
          <div>
            <h1 className='font-semibold text-lg leading-none'>后台登录</h1>
            <p className='mt-1 text-[#a8aaa8] text-xs'>
              {isSignUp ? '创建管理员账号' : '进入图片管理'}
            </p>
          </div>
        </div>

        <div className='grid gap-3'>
          {isSignUp && (
            <input
              autoComplete='name'
              className='h-10 rounded-md border border-[#3b3c3b] bg-[#17181b] px-3 text-sm outline-none focus:border-[#73e0d3]'
              onChange={(event) => setName(event.target.value)}
              placeholder='名称'
              required
              type='text'
              value={name}
            />
          )}
          <input
            autoComplete='email'
            className='h-10 rounded-md border border-[#3b3c3b] bg-[#17181b] px-3 text-sm outline-none focus:border-[#73e0d3]'
            onChange={(event) => setEmail(event.target.value)}
            placeholder='Email'
            required
            type='email'
            value={email}
          />
          <input
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            className='h-10 rounded-md border border-[#3b3c3b] bg-[#17181b] px-3 text-sm outline-none focus:border-[#73e0d3]'
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder='Password'
            required
            type='password'
            value={password}
          />
        </div>

        {error && (
          <p className='mt-3 rounded-md border border-[#74403d] bg-[#321f20] px-3 py-2 text-[#ffb6ad] text-sm'>
            {error}
          </p>
        )}

        <button
          className='mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[#73e0d3] font-semibold text-[#151615] text-sm transition hover:bg-[#8bece0] disabled:opacity-60'
          disabled={loading}
          type='submit'
        >
          {loading ? <Loader2 className='size-4 animate-spin' /> : null}
          {isSignUp ? '创建账号' : '登录'}
        </button>
        <button
          className='mt-3 w-full text-[#a8aaa8] text-xs hover:text-[#ebe7df]'
          onClick={() => {
            setError('')
            setIsSignUp((value) => !value)
          }}
          type='button'
        >
          {isSignUp ? '已有账号，去登录' : '没有账号，创建一个'}
        </button>
      </form>
    </div>
  )
}
