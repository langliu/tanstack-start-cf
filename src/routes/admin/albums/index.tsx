import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Edit, FolderOpen, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { orpc } from '#/orpc/client'
import { invalidateAdminQueries } from '../route'

const PAGE_SIZE = 20

type AlbumRow = {
  agency?: { id: string; name: string } | null
  agencyId?: string | null
  createdAt: string | number | Date
  id: string
  name: string
  sortOrder: number
  updatedAt: string | number | Date
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
    mutationFn: () =>
      orpc.admin.albums.update.call({
        agencyId: formAgencyId || null,
        id: editingId!,
        name: formName,
        sortOrder: Number(formSortOrder) || 0,
      }),
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
  const items = (data as { items?: unknown[] } | undefined)?.items ?? []
  const agencies = agenciesQuery.data
    ? ((agenciesQuery.data as { items?: unknown[] }).items ?? agenciesQuery.data)
    : []

  const saveMutation = editingId ? updateMutation : createMutation
  const drawerTitle = editingId ? '编辑专辑' : '新增专辑'

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function formatDate(v: string | number | Date) {
    const d = new Date(v)
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('zh-CN')
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
    console.log(album)
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
    <section className='flex min-w-0 flex-col'>
      <div className='flex min-h-14 items-center gap-3 border-[#333331] border-b bg-[#1d1e22] px-4'>
        <FolderOpen className='size-5 text-[#73e0d3]' />
        <h1 className='font-semibold text-base'>专辑管理</h1>
      </div>
      <div className='flex shrink-0 items-center gap-3 border-[#333331] border-b bg-[#1d1e22] px-4 py-3'>
        <div className='relative flex-1'>
          <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#777a75]' />
          <input
                className='h-9 w-full rounded-md border border-[#383a37] bg-[#17181b] pl-9 pr-3 text-sm text-[#ebe7df] outline-none placeholder:text-[#777a75] focus:border-[#73e0d3]'
            onChange={(e) => {
              setQ(e.target.value)
              setPage(0)
            }}
            placeholder='搜索专辑...'
            value={q}
          />
        </div>
        <select
          className='h-9 rounded-md border border-[#383a37] bg-[#17181b] px-3 text-sm text-[#ebe7df] outline-none focus:border-[#73e0d3]'
          onChange={(e) => {
            setAgencyFilter(e.target.value)
            setPage(0)
          }}
          value={agencyFilter}
        >
          <option value=''>全部机构</option>
          {Array.isArray(agencies) &&
            agencies.map((a: { id: string; name: string }) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
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
                  <TableHead className='text-[#9da19b] text-xs'>名称</TableHead>
                  <TableHead className='text-[#9da19b] text-xs'>机构</TableHead>
                  <TableHead className='text-[#9da19b] text-xs'>排序</TableHead>
                  <TableHead className='text-[#9da19b] text-xs'>创建时间</TableHead>
                  <TableHead className='text-[#9da19b] text-xs'>更新时间</TableHead>
                  <TableHead className='w-20 text-[#9da19b] text-xs'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(items) && items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className='py-12 text-center text-[#777a75]'
                      colSpan={6}
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.isArray(items) &&
                  items.map((item) => {
                    const album = item as AlbumRow
                    return (
                      <TableRow key={album.id}>
                        <TableCell className='max-w-0 font-medium'>
                          <button
                            className='block max-w-full truncate text-left hover:text-[#73e0d3]'
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
                        <TableCell className='text-[#9da19b]'>
                          {album.agency?.name ?? '-'}
                        </TableCell>
                        <TableCell className='text-[#9da19b]'>
                          {album.sortOrder}
                        </TableCell>
                        <TableCell className='text-[#9da19b] text-xs'>
                          {formatDate(album.createdAt)}
                        </TableCell>
                        <TableCell className='text-[#9da19b] text-xs'>
                          {formatDate(album.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            <button
                              className='inline-flex size-8 items-center justify-center rounded-md text-[#9da19b] hover:bg-[#2c302f]'
                              onClick={() => openEdit(album)}
                              title='编辑'
                              type='button'
                            >
                              <Edit className='size-4' />
                            </button>
                            <button
                              className='inline-flex size-8 items-center justify-center rounded-md text-[#ffb7aa] hover:bg-[#352322]'
                              onClick={() => deleteMutation.mutate(album.id)}
                              title='删除'
                              type='button'
                            >
                              <Trash2 className='size-4' />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className='flex items-center justify-center gap-2 border-[#333331] border-t px-4 py-3'>
                <Button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  size='sm'
                  variant='ghost'
                >
                  上一页
                </Button>
                <span className='text-[#9da19b] text-sm'>
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
        <SheetContent className='border-[#333331] bg-[#1d1e22] text-[#ebe7df]' side='right'>
          <SheetHeader>
            <SheetTitle>{drawerTitle}</SheetTitle>
            <SheetDescription />
          </SheetHeader>
          <div className='flex flex-col gap-4 px-4'>
            <div className='flex flex-col gap-1.5'>
              <Label>名称 *</Label>
              <Input
                onChange={(e) => setFormName(e.target.value)}
                placeholder='请输入名称'
                value={formName}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label>机构</Label>
              <Select
                onValueChange={(v) => setFormAgencyId(v)}
                value={formAgencyId || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder='无机构' />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(agencies) &&
                    agencies.map(
                      (a: { id: string; name: string }) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ),
                    )}
                </SelectContent>
              </Select>
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label>排序</Label>
              <Input
                onChange={(e) => setFormSortOrder(e.target.value)}
                placeholder='0'
                type='number'
                value={formSortOrder}
              />
            </div>
          </div>
          <SheetFooter>
            {saveMutation.isError && (
              <p className='text-[#ffb7aa] text-xs'>
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : '保存失败'}
              </p>
            )}
            <div className='flex gap-3'>
              <SheetClose asChild>
                <Button variant='outline' onClick={closeDrawer}>
                  取消
                </Button>
              </SheetClose>
              <Button
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
