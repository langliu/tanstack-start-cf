import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Plus, Search, Tags, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { orpc } from '#/orpc/client'
import { Button } from '#/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { invalidateAdminQueries } from './route'

const PAGE_SIZE = 20

export const Route = createFileRoute('/admin/tags')({
  component: TagsPage,
})

function TagsPage() {
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('#73e0d3')

  const tagsQuery = useQuery(
    orpc.admin.tags.list.queryOptions({
      input: { limit: PAGE_SIZE, offset: page * PAGE_SIZE, q: q || undefined },
    }),
  )

  const createMutation = useMutation({
    mutationFn: () =>
      orpc.admin.tags.create.call({
        color: formColor,
        name: formName,
      }),
    onSuccess: () => {
      setDrawerOpen(false)
      setFormName('')
      setFormColor('#73e0d3')
      invalidateAdminQueries(queryClient)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orpc.admin.tags.delete.call({ id }),
    onSuccess: () => invalidateAdminQueries(queryClient),
  })

  const { data, isFetching } = tagsQuery
  const total = (data as { total?: number } | undefined)?.total ?? 0
  const items = (data as { items?: unknown[] } | undefined)?.items ?? []
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <section className='flex min-w-0 flex-col'>
      <div className='flex min-h-14 items-center gap-3 border-[#333331] border-b bg-[#1d1e22] px-4'>
        <Tags className='size-5 text-[#73e0d3]' />
        <h1 className='font-semibold text-base'>标签管理</h1>
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
            placeholder='搜索标签...'
            value={q}
          />
        </div>
        <Button
          onClick={() => {
            setFormName('')
            setFormColor('#73e0d3')
            setDrawerOpen(true)
          }}
        >
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
            <table className='w-full table-auto'>
              <thead>
                <tr className='border-[#333331] border-b text-left text-[#9da19b] text-xs'>
                  <th className='px-4 py-3 font-medium'>名称</th>
                  <th className='px-4 py-3 font-medium'>颜色</th>
                  <th className='w-16 px-4 py-3 font-medium'>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      className='px-4 py-12 text-center text-[#777a75] text-sm'
                      colSpan={3}
                    >
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  items.map(
                    (tag: { color?: string | null; id: string; name: string }) => (
                      <tr
                        className='border-[#333331] border-b transition-colors hover:bg-[#202125]'
                        key={tag.id}
                      >
                        <td className='max-w-0 px-4 py-3 font-medium text-sm'>
                          <span className='block truncate'>{tag.name}</span>
                        </td>
                        <td className='px-4 py-3'>
                          {tag.color && (
                            <span
                              className='inline-block size-5 rounded-full border border-[#383a37]'
                              style={{ backgroundColor: tag.color }}
                            />
                          )}
                        </td>
                        <td className='px-4 py-3'>
                          <button
                            className='inline-flex size-8 items-center justify-center rounded-md text-[#ffb7aa] hover:bg-[#352322]'
                            onClick={() => deleteMutation.mutate(tag.id)}
                            title='删除'
                            type='button'
                          >
                            <Trash2 className='size-4' />
                          </button>
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
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

      <Drawer
        direction='right'
        onOpenChange={setDrawerOpen}
        open={drawerOpen}
      >
        <DrawerContent className='border-[#333331] bg-[#1d1e22] text-[#ebe7df]'>
          <DrawerHeader>
            <DrawerTitle>新增标签</DrawerTitle>
          </DrawerHeader>
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
              <Label>颜色</Label>
              <div className='flex items-center gap-3'>
                <Input
                  className='w-24'
                  onChange={(e) => setFormColor(e.target.value)}
                  type='color'
                  value={formColor}
                />
                <span className='text-[#9da19b] text-xs'>{formColor}</span>
              </div>
            </div>
          </div>
          <DrawerFooter>
            {createMutation.isError && (
              <p className='text-[#ffb7aa] text-xs'>
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : '创建失败'}
              </p>
            )}
            <div className='flex gap-3'>
              <DrawerClose asChild>
                <Button variant='outline'>取消</Button>
              </DrawerClose>
              <Button
                disabled={
                  formName.trim().length === 0 || createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  '创建'
                )}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </section>
  )
}
