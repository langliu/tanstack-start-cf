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
  Trash2,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
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
    <main className='admin-shell fixed inset-0 bg-background text-foreground'>
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
    <Button
      className='h-8 px-3'
      disabled={disabled}
      onClick={onClick}
      size='sm'
      type='button'
      variant='secondary'
    >
      {children}
    </Button>
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
    <Input
      className='h-9 bg-background/60'
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type='text'
      value={value}
    />
  )
}

export function invalidateAdminQueries(
  queryClient: ReturnType<
    typeof import('@tanstack/react-query').useQueryClient
  >,
) {
  return queryClient.invalidateQueries()
}

function AdminSidebar({ userEmail }: { userEmail: string }) {
  const navigate = useNavigate()
  const { pathname, searchStr } = useLocation()
  const searchParams = new URLSearchParams(searchStr)
  const currentFilter = searchParams.get('filter') ?? 'all'

  const statsQuery = useQuery(orpc.admin.stats.queryOptions({ input: {} }))
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

  const albums =
    (albumsQuery.data as { items?: unknown[] } | undefined)?.items ?? []
  const tags =
    (tagsQuery.data as { items?: unknown[] } | undefined)?.items ?? []
  const models =
    (modelsQuery.data as { items?: unknown[] } | undefined)?.items ?? []
  const agencies =
    (agenciesQuery.data as { items?: unknown[] } | undefined)?.items ?? []

  return (
    <aside className='flex min-h-0 flex-col border-sidebar-border border-r bg-sidebar text-sidebar-foreground'>
      <div className='flex h-14 items-center gap-3 border-sidebar-border border-b px-4 max-lg:justify-center max-lg:px-2'>
        <div className='grid size-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground'>
          <Images className='size-5' />
        </div>
        <div className='min-w-0 max-lg:hidden'>
          <p className='truncate font-semibold text-sm'>图片管理</p>
          <p className='truncate text-muted-foreground text-xs'>{userEmail}</p>
        </div>
      </div>

      <nav className='flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 max-lg:px-2'>
        <div className='flex flex-col gap-1'>
          <SidebarButton
            active={pathname === '/admin' && currentFilter === 'all'}
            count={statsQuery.data?.total}
            icon={<Images />}
            label='全部'
            onClick={() =>
              navigate({ search: { filter: 'all' }, to: '/admin' })
            }
          />
          <SidebarButton
            active={pathname === '/admin' && currentFilter === 'untagged'}
            count={statsQuery.data?.untagged}
            icon={<Tags />}
            label='未标签'
            onClick={() =>
              navigate({ search: { filter: 'untagged' }, to: '/admin' })
            }
          />
          <SidebarButton
            active={pathname === '/admin' && currentFilter === 'unalbumed'}
            count={statsQuery.data?.unalbumed}
            icon={<FolderOpen />}
            label='未专辑'
            onClick={() =>
              navigate({ search: { filter: 'unalbumed' }, to: '/admin' })
            }
          />
          <SidebarButton
            active={pathname === '/admin/trash'}
            count={statsQuery.data?.trash}
            icon={<Trash2 />}
            label='回收站'
            onClick={() => navigate({ to: '/admin/trash' })}
          />
        </div>

        <Separator />
        <div className='flex flex-col gap-1'>
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
        'flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sidebar-foreground text-sm transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground max-lg:justify-center max-lg:px-2',
        active && 'bg-sidebar-accent text-sidebar-accent-foreground',
      )}
      onClick={onClick}
      title={label}
      type='button'
    >
      <span className='[&_svg]:size-4'>{icon}</span>
      <span className='min-w-0 flex-1 truncate max-lg:hidden'>{label}</span>
      {count !== undefined && (
        <Badge
          className='h-5 min-w-5 px-1.5 text-[10px] tabular-nums max-lg:hidden'
          variant='secondary'
        >
          {count}
        </Badge>
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
    <div className='grid h-full place-items-center bg-background px-4'>
      <form
        className='w-full max-w-sm rounded-lg border bg-card p-5 text-card-foreground shadow-2xl'
        onSubmit={submit}
      >
        <div className='mb-5 flex items-center gap-3'>
          <div className='grid size-10 place-items-center rounded-md bg-primary text-primary-foreground'>
            <Images className='size-5' />
          </div>
          <div>
            <h1 className='font-semibold text-lg leading-none'>后台登录</h1>
            <p className='mt-1 text-muted-foreground text-xs'>
              {isSignUp ? '创建管理员账号' : '进入图片管理'}
            </p>
          </div>
        </div>

        <div className='grid gap-3'>
          {isSignUp && (
            <Input
              autoComplete='name'
              className='h-10 bg-background/60'
              onChange={(event) => setName(event.target.value)}
              placeholder='名称'
              required
              type='text'
              value={name}
            />
          )}
          <Input
            autoComplete='email'
            className='h-10 bg-background/60'
            onChange={(event) => setEmail(event.target.value)}
            placeholder='Email'
            required
            type='email'
            value={email}
          />
          <Input
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            className='h-10 bg-background/60'
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder='Password'
            required
            type='password'
            value={password}
          />
        </div>

        {error && (
          <p className='mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm'>
            {error}
          </p>
        )}

        <Button className='mt-4 h-10 w-full' disabled={loading} type='submit'>
          {loading ? <Loader2 className='size-4 animate-spin' /> : null}
          {isSignUp ? '创建账号' : '登录'}
        </Button>
        <Button
          className='mt-3 w-full'
          onClick={() => {
            setError('')
            setIsSignUp((value) => !value)
          }}
          type='button'
          variant='ghost'
        >
          {isSignUp ? '已有账号，去登录' : '没有账号，创建一个'}
        </Button>
      </form>
    </div>
  )
}
