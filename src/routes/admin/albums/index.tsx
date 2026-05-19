import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Edit,
  FolderOpen,
  ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { orpc } from '#/orpc/client'
import { invalidateAdminQueries } from '../route'

const PAGE_SIZE = 20
const ALL_AGENCIES_VALUE = '__all_agencies__'
const NO_AGENCY_VALUE = '__no_agency__'

type AlbumRow = {
  agency?: { id: string; name: string } | null
  agencyId?: string | null
  coverImage?: {
    id: string
    thumbnailUrl: string
    title: string
  } | null
  createdAt: string | number | Date
  id: string
  name: string
  sortOrder: number
  updatedAt: string | number | Date
}

type AgencyOption = {
  id: string
  name: string
}

export const Route = createFileRoute('/admin/albums/')({
  component: AlbumsIndexPage,
})

function AlbumsIndexPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [agencyFilter, setAgencyFilter] = useState('')
  const [page, setPage] = useState(0)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formAgencyId, setFormAgencyId] = useState('')
  const [formSortOrder, setFormSortOrder] = useState('0')

  const [editingId, setEditingId] = useState<string | null>(null)

  const albumsQuery = useQuery(
    orpc.admin.albums.list.queryOptions({
      input: {
        agencyId: agencyFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        q: q || undefined,
      },
    }),
  )
  const agenciesQuery = useQuery(
    orpc.admin.agencies.list.queryOptions({ input: { limit: 200 } }),
  )

  const createMutation = useMutation({
    mutationFn: () =>
      orpc.admin.albums.create.call({
        agencyId: formAgencyId || null,
        name: formName,
        sortOrder: Number(formSortOrder) || 0,
      }),
    onSuccess: () => {
      closeDrawer()
      invalidateAdminQueries(queryClient)
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingId) {
        throw new Error('缺少专辑 ID')
      }

      return orpc.admin.albums.update.call({
        agencyId: formAgencyId || null,
        id: editingId,
        name: formName,
        sortOrder: Number(formSortOrder) || 0,
      })
    },
    onSuccess: () => {
      closeDrawer()
      invalidateAdminQueries(queryClient)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orpc.admin.albums.delete.call({ id }),
    onSuccess: () => invalidateAdminQueries(queryClient),
  })

  const { data, isFetching } = albumsQuery
  const total = (data as { total?: number } | undefined)?.total ?? 0
  const items = (data as { items?: AlbumRow[] } | undefined)?.items ?? []
  const agencies =
    (agenciesQuery.data as { items?: AgencyOption[] } | undefined)?.items ?? []

  const saveMutation = editingId ? updateMutation : createMutation
  const drawerTitle = editingId ? '编辑专辑' : '新增专辑'

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function formatDate(v: string | number | Date) {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('zh-CN')
  }

  function resetForm() {
    setFormName('')
    setFormAgencyId('')
    setFormSortOrder('0')
  }

  function openCreate() {
    resetForm()
    setEditingId(null)
    setDrawerOpen(true)
  }

  function openEdit(album: AlbumRow) {
    setFormName(album.name)
    setFormAgencyId(album.agencyId ?? '')
    setFormSortOrder(String(album.sortOrder))
    setEditingId(album.id)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingId(null)
  }

  return (
    <section className='flex h-full min-h-0 min-w-0 flex-col'>
      <div className='flex min-h-14 items-center gap-3 border-b bg-card px-4'>
        <FolderOpen className='size-5 text-primary' />
        <h1 className='font-semibold text-base'>专辑管理</h1>
      </div>
      <div className='flex shrink-0 items-center gap-3 border-b bg-card px-4 py-3'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            className='pl-9'
            onChange={(e) => {
              setQ(e.target.value)
              setPage(0)
            }}
            placeholder='搜索专辑...'
            value={q}
          />
        </div>
        <Select
          onValueChange={(value) => {
            setAgencyFilter(value === ALL_AGENCIES_VALUE ? '' : value)
            setPage(0)
          }}
          value={agencyFilter || ALL_AGENCIES_VALUE}
        >
          <SelectTrigger className='h-9 min-w-32 bg-background'>
            <SelectValue placeholder='全部机构' />
          </SelectTrigger>
          <SelectContent className='admin-shell'>
            <SelectGroup>
              <SelectItem value={ALL_AGENCIES_VALUE}>全部机构</SelectItem>
              {Array.isArray(agencies) &&
                agencies.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>
          <Plus className='size-4' />
          新增
        </Button>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto'>
        {isFetching ? (
          <div className='grid place-items-center py-16'>
            <Loader2 className='size-7 animate-spin text-[#73e0d3]' />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[120px]'>封面</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>机构</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className='w-20'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(items) && items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className='py-12 text-center text-muted-foreground'
                      colSpan={7}
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.isArray(items) &&
                  items.map((album) => {
                    return (
                      <TableRow key={album.id}>
                        <TableCell>
                          <AlbumCoverThumb album={album} />
                        </TableCell>
                        <TableCell className='max-w-0 font-medium'>
                          <button
                            className='block max-w-full truncate text-left hover:text-primary'
                            onClick={() =>
                              navigate({
                                params: { albumId: album.id },
                                to: '/admin/albums/$albumId',
                              })
                            }
                            title='查看图片'
                            type='button'
                          >
                            {album.name}
                          </button>
                        </TableCell>
                        <TableCell className='text-muted-foreground'>
                          {album.agency?.name ?? '-'}
                        </TableCell>
                        <TableCell className='text-muted-foreground'>
                          {album.sortOrder}
                        </TableCell>
                        <TableCell className='text-muted-foreground text-xs'>
                          {formatDate(album.createdAt)}
                        </TableCell>
                        <TableCell className='text-muted-foreground text-xs'>
                          {formatDate(album.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            <Button
                              onClick={() => openEdit(album)}
                              size='icon-sm'
                              title='编辑'
                              type='button'
                              variant='ghost'
                            >
                              <Edit className='size-4' />
                            </Button>
                            <Button
                              onClick={() => deleteMutation.mutate(album.id)}
                              size='icon-sm'
                              title='删除'
                              type='button'
                              variant='ghost'
                            >
                              <Trash2 className='size-4' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className='flex items-center justify-center gap-2 border-t px-4 py-3'>
                <Button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  size='sm'
                  variant='ghost'
                >
                  上一页
                </Button>
                <span className='text-muted-foreground text-sm'>
                  {page + 1} / {totalPages}
                </span>
                <Button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  size='sm'
                  variant='ghost'
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Sheet
        onOpenChange={(open) => {
          if (!open) closeDrawer()
        }}
        open={drawerOpen}
      >
        <SheetContent
          className='admin-shell w-[min(420px,calc(100vw-16px))] gap-0 border-border bg-card p-0 text-card-foreground shadow-2xl sm:max-w-[420px]'
          showCloseButton={false}
          side='right'
        >
          <SheetHeader className='border-b px-5 py-4'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <SheetTitle className='text-lg'>{drawerTitle}</SheetTitle>
                <SheetDescription className='mt-1 text-xs'>
                  {editingId ? '更新专辑信息和展示排序' : '创建新的图片专辑'}
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <button
                  className='inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-accent-foreground'
                  onClick={closeDrawer}
                  title='关闭'
                  type='button'
                >
                  <X className='size-5' />
                </button>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className='min-h-0 flex-1 overflow-y-auto px-5 py-5'>
            <div className='space-y-5'>
              <div className='space-y-2'>
                <Label className='text-sm'>名称 *</Label>
                <Input
                  className='h-10 bg-background/60'
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder='请输入名称'
                  value={formName}
                />
              </div>

              <div className='space-y-2'>
                <Label className='text-sm'>机构</Label>
                <Select
                  onValueChange={(value) =>
                    setFormAgencyId(value === NO_AGENCY_VALUE ? '' : value)
                  }
                  value={formAgencyId || NO_AGENCY_VALUE}
                >
                  <SelectTrigger className='h-10 w-full bg-background/60'>
                    <SelectValue placeholder='无机构' />
                  </SelectTrigger>
                  <SelectContent className='admin-shell'>
                    <SelectGroup>
                      <SelectItem value={NO_AGENCY_VALUE}>无机构</SelectItem>
                      {Array.isArray(agencies) &&
                        agencies.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label className='text-sm'>排序</Label>
                <Input
                  className='h-10 bg-background/60'
                  onChange={(e) => setFormSortOrder(e.target.value)}
                  placeholder='0'
                  type='number'
                  value={formSortOrder}
                />
              </div>
            </div>
          </div>

          <SheetFooter className='mt-0 border-t bg-background p-5'>
            {saveMutation.isError && (
              <p className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs'>
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : '保存失败'}
              </p>
            )}
            <div className='grid grid-cols-2 gap-3'>
              <SheetClose asChild>
                <Button
                  className='h-10'
                  onClick={closeDrawer}
                  variant='outline'
                >
                  取消
                </Button>
              </SheetClose>
              <Button
                className='h-10'
                disabled={
                  formName.trim().length === 0 || saveMutation.isPending
                }
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  '保存'
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  )
}

function AlbumCoverThumb({ album }: { album: AlbumRow }) {
  if (!album.coverImage) {
    return (
      <div className='grid h-20 w-[120px] place-items-center rounded-md border bg-background text-muted-foreground'>
        <ImageIcon className='size-4' />
      </div>
    )
  }

  return (
    <img
      alt={album.coverImage.title}
      className='h-auto w-[120px] rounded-md border object-contain'
      loading='lazy'
      src={album.coverImage.thumbnailUrl}
    />
  )
}
