import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Building2, Edit, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { orpc } from '#/orpc/client'
import { invalidateAdminQueries } from './route'

const PAGE_SIZE = 20

type AgencyRow = {
  id: string
  name: string
  websiteUrl?: string | null
}

export const Route = createFileRoute('/admin/agencies')({
  component: AgenciesPage,
})

function AgenciesPage() {
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<null | string>(null)
  const [formName, setFormName] = useState('')
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('')

  const agenciesQuery = useQuery(
    orpc.admin.agencies.list.queryOptions({
      input: { limit: PAGE_SIZE, offset: page * PAGE_SIZE, q: q || undefined },
    }),
  )

  const createMutation = useMutation({
    mutationFn: () =>
      orpc.admin.agencies.create.call({
        name: formName,
        websiteUrl: formWebsiteUrl || null,
      }),
    onSuccess: () => {
      setDrawerOpen(false)
      setFormName('')
      setFormWebsiteUrl('')
      invalidateAdminQueries(queryClient)
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingId) {
        throw new Error('缺少机构 ID')
      }

      return orpc.admin.agencies.update.call({
        id: editingId,
        name: formName,
        websiteUrl: formWebsiteUrl || null,
      })
    },
    onSuccess: () => {
      closeDrawer()
      invalidateAdminQueries(queryClient)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orpc.admin.agencies.delete.call({ id }),
    onSuccess: () => invalidateAdminQueries(queryClient),
  })

  const { data, isFetching } = agenciesQuery
  const total = (data as { total?: number } | undefined)?.total ?? 0
  const items = (data as { items?: AgencyRow[] } | undefined)?.items ?? []
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const saveMutation = editingId ? updateMutation : createMutation
  const drawerTitle = editingId ? '编辑机构' : '新增机构'

  function blurActiveElement() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  function resetForm() {
    setFormName('')
    setFormWebsiteUrl('')
  }

  function openCreate() {
    blurActiveElement()
    resetForm()
    setEditingId(null)
    setDrawerOpen(true)
  }

  function openEdit(agency: AgencyRow) {
    blurActiveElement()
    setFormName(agency.name)
    setFormWebsiteUrl(agency.websiteUrl ?? '')
    setEditingId(agency.id)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditingId(null)
  }

  return (
    <section className='flex h-full min-h-0 min-w-0 flex-col'>
      <div className='flex min-h-14 items-center gap-3 border-b bg-card px-4'>
        <Building2 className='size-5 text-primary' />
        <h1 className='font-semibold text-base'>机构管理</h1>
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
            placeholder='搜索机构...'
            value={q}
          />
        </div>
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
                  <TableHead>名称</TableHead>
                  <TableHead>网址</TableHead>
                  <TableHead className='w-24'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className='py-12 text-center text-muted-foreground'
                      colSpan={3}
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((agency) => (
                    <TableRow key={agency.id}>
                      <TableCell className='max-w-0 font-medium'>
                        <span className='block truncate'>{agency.name}</span>
                      </TableCell>
                      <TableCell className='max-w-48 truncate text-muted-foreground'>
                        {agency.websiteUrl ?? '-'}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          <Button
                            onClick={() => openEdit(agency)}
                            size='icon-sm'
                            title='编辑'
                            type='button'
                            variant='ghost'
                          >
                            <Edit className='size-4' />
                          </Button>
                          <Button
                            onClick={() => deleteMutation.mutate(agency.id)}
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
                  ))
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

      <Drawer
        direction='right'
        onOpenChange={(open) => {
          if (open) {
            setDrawerOpen(true)
            return
          }

          closeDrawer()
        }}
        open={drawerOpen}
      >
        <DrawerContent className='admin-shell border-border bg-card text-card-foreground'>
          <DrawerHeader>
            <DrawerTitle>{drawerTitle}</DrawerTitle>
            <DrawerDescription>
              维护机构名称和官网地址，用于专辑归属和筛选。
            </DrawerDescription>
          </DrawerHeader>
          <div className='flex flex-col gap-4 px-4'>
            <div className='flex flex-col gap-1.5'>
              <Label>名称 *</Label>
              <Input
                className='bg-background/60'
                onChange={(e) => setFormName(e.target.value)}
                placeholder='请输入名称'
                value={formName}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label>网址</Label>
              <Input
                className='bg-background/60'
                onChange={(e) => setFormWebsiteUrl(e.target.value)}
                placeholder='https://'
                value={formWebsiteUrl}
              />
            </div>
          </div>
          <DrawerFooter>
            {saveMutation.isError && (
              <p className='text-destructive text-xs'>
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : '保存失败'}
              </p>
            )}
            <div className='flex gap-3'>
              <DrawerClose asChild>
                <Button variant='outline'>取消</Button>
              </DrawerClose>
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
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </section>
  )
}
