import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Edit,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
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
import { Textarea } from '#/components/ui/textarea'
import { orpc } from '#/orpc/client'
import { invalidateAdminQueries } from './route'

const PAGE_SIZE = 20

type ModelRow = {
  alias?: string | null
  avatarObjectKey?: string | null
  bio?: string | null
  id: string
  instagramUrl?: string | null
  name: string
  weiboUrl?: string | null
  xUrl?: string | null
}

type AvatarUploadResult = {
  avatar: {
    objectKey: string
    publicUrl: string
  }
}

export const Route = createFileRoute('/admin/models')({
  component: ModelsPage,
})

function ModelsPage() {
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<null | string>(null)
  const [formName, setFormName] = useState('')
  const [formAlias, setFormAlias] = useState('')
  const [formAvatarFile, setFormAvatarFile] = useState<File | null>(null)
  const [formAvatarObjectKey, setFormAvatarObjectKey] = useState('')
  const [formAvatarPreviewUrl, setFormAvatarPreviewUrl] = useState('')
  const [formBio, setFormBio] = useState('')
  const [formInstagramUrl, setFormInstagramUrl] = useState('')
  const [formWeiboUrl, setFormWeiboUrl] = useState('')
  const [formXUrl, setFormXUrl] = useState('')
  const [uploadError, setUploadError] = useState('')

  const modelsQuery = useQuery(
    orpc.admin.models.list.queryOptions({
      input: { limit: PAGE_SIZE, offset: page * PAGE_SIZE, q: q || undefined },
    }),
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      let uploadedAvatarObjectKey: null | string = null
      const avatarObjectKey = await uploadAvatarIfNeeded()
      if (formAvatarFile && avatarObjectKey) {
        uploadedAvatarObjectKey = avatarObjectKey
      }
      const payload = {
        alias: formAlias || null,
        avatarObjectKey,
        bio: formBio || null,
        instagramUrl: formInstagramUrl || null,
        name: formName,
        weiboUrl: formWeiboUrl || null,
        xUrl: formXUrl || null,
      }

      try {
        if (editingId) {
          return await orpc.admin.models.update.call({
            ...payload,
            id: editingId,
          })
        }

        return await orpc.admin.models.create.call(payload)
      } catch (error) {
        if (uploadedAvatarObjectKey) {
          await deleteUploadedAvatar(uploadedAvatarObjectKey)
        }
        throw error
      }
    },
    onSuccess: () => {
      closeDrawer()
      invalidateAdminQueries(queryClient)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orpc.admin.models.delete.call({ id }),
    onSuccess: () => invalidateAdminQueries(queryClient),
  })

  const { data, isFetching } = modelsQuery
  const total = (data as { total?: number } | undefined)?.total ?? 0
  const items = (data as { items?: ModelRow[] } | undefined)?.items ?? []
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const drawerTitle = editingId ? '编辑模特' : '新增模特'

  function blurActiveElement() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  function resetForm() {
    if (formAvatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formAvatarPreviewUrl)
    }

    setEditingId(null)
    setFormName('')
    setFormAlias('')
    setFormAvatarFile(null)
    setFormAvatarObjectKey('')
    setFormAvatarPreviewUrl('')
    setFormBio('')
    setFormInstagramUrl('')
    setFormWeiboUrl('')
    setFormXUrl('')
    setUploadError('')
  }

  function openCreate() {
    blurActiveElement()
    resetForm()
    setDrawerOpen(true)
  }

  function openEdit(model: ModelRow) {
    blurActiveElement()
    if (formAvatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formAvatarPreviewUrl)
    }

    setEditingId(model.id)
    setFormName(model.name)
    setFormAlias(model.alias ?? '')
    setFormAvatarFile(null)
    setFormAvatarObjectKey(model.avatarObjectKey ?? '')
    setFormAvatarPreviewUrl(
      model.avatarObjectKey ? publicAssetUrl(model.avatarObjectKey) : '',
    )
    setFormBio(model.bio ?? '')
    setFormInstagramUrl(model.instagramUrl ?? '')
    setFormWeiboUrl(model.weiboUrl ?? '')
    setFormXUrl(model.xUrl ?? '')
    setUploadError('')
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    resetForm()
  }

  async function handleAvatarChange(file: File | undefined) {
    setUploadError('')

    if (!file) {
      return
    }

    try {
      const prepared = await prepareModelAvatar(file)
      if (formAvatarPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formAvatarPreviewUrl)
      }
      setFormAvatarFile(prepared)
      setFormAvatarPreviewUrl(URL.createObjectURL(prepared))
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '头像处理失败')
    }
  }

  async function uploadAvatarIfNeeded() {
    if (!formAvatarFile) {
      return formAvatarObjectKey || null
    }

    const formData = new FormData()
    formData.append('avatar', formAvatarFile)
    formData.append(
      'metadata',
      JSON.stringify(editingId ? { modelId: editingId } : {}),
    )

    const response = await fetch('/api/admin/models/avatar/upload', {
      body: formData,
      method: 'POST',
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      throw new Error(payload?.error ?? '头像上传失败')
    }

    const payload = (await response.json()) as AvatarUploadResult
    return payload.avatar.objectKey
  }

  return (
    <section className='flex h-full min-h-0 min-w-0 flex-col'>
      <div className='flex min-h-14 items-center gap-3 border-b bg-card px-4'>
        <UserRound className='size-5 text-primary' />
        <h1 className='font-semibold text-base'>模特管理</h1>
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
            placeholder='搜索模特...'
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
                  <TableHead className='w-16'>头像</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>别名</TableHead>
                  <TableHead className='w-24'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className='py-12 text-center text-muted-foreground'
                      colSpan={4}
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        <div className='grid size-10 place-items-center overflow-hidden rounded-md border bg-background'>
                          {model.avatarObjectKey ? (
                            <img
                              alt={model.name}
                              className='size-full object-cover'
                              src={publicAssetUrl(model.avatarObjectKey)}
                            />
                          ) : (
                            <UserRound className='size-4 text-muted-foreground' />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className='max-w-0 font-medium'>
                        <span className='block truncate'>{model.name}</span>
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {model.alias ?? '-'}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          <Button
                            onClick={() => openEdit(model)}
                            size='icon-sm'
                            title='编辑'
                            type='button'
                            variant='ghost'
                          >
                            <Edit className='size-4' />
                          </Button>
                          <Button
                            onClick={() => deleteMutation.mutate(model.id)}
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

      <Sheet
        onOpenChange={(open) => {
          if (open) {
            setDrawerOpen(true)
            return
          }

          closeDrawer()
        }}
        open={drawerOpen}
      >
        <SheetContent
          className='admin-shell border-border bg-card text-card-foreground'
          side='right'
        >
          <SheetHeader>
            <SheetTitle>{drawerTitle}</SheetTitle>
            <SheetDescription>
              上传独立头像并维护模特资料，头像不会进入首页图片库。
            </SheetDescription>
          </SheetHeader>
          <div className='flex max-h-[calc(100vh-12rem)] flex-col gap-4 overflow-y-auto px-4'>
            <div className='flex flex-col gap-2'>
              <Label>头像</Label>
              <div className='flex items-center gap-3'>
                <div className='grid size-20 place-items-center overflow-hidden rounded-md border bg-background'>
                  {formAvatarPreviewUrl ? (
                    <img
                      alt='模特头像预览'
                      className='size-full object-cover'
                      src={formAvatarPreviewUrl}
                    />
                  ) : (
                    <UserRound className='size-7 text-muted-foreground' />
                  )}
                </div>
                <div className='flex min-w-0 flex-col gap-2'>
                  <label
                    className='inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm shadow-xs transition hover:bg-accent hover:text-accent-foreground'
                    htmlFor='model-avatar-upload'
                  >
                    <ImagePlus className='size-4' />
                    选择图片
                  </label>
                  <Input
                    accept='image/*'
                    className='sr-only'
                    id='model-avatar-upload'
                    onChange={(event) => {
                      void handleAvatarChange(event.target.files?.[0])
                      event.currentTarget.value = ''
                    }}
                    type='file'
                  />
                  <p className='text-muted-foreground text-xs'>
                    自动裁剪为正方形并压缩为 WebP
                  </p>
                </div>
              </div>
            </div>

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
              <Label>别名</Label>
              <Input
                className='bg-background/60'
                onChange={(e) => setFormAlias(e.target.value)}
                placeholder='请输入别名'
                value={formAlias}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label>简介</Label>
              <Textarea
                className='bg-background/60'
                onChange={(e) => setFormBio(e.target.value)}
                placeholder='请输入简介'
                value={formBio}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label>Instagram</Label>
              <Input
                className='bg-background/60'
                onChange={(e) => setFormInstagramUrl(e.target.value)}
                placeholder='https://instagram.com/...'
                value={formInstagramUrl}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label>微博</Label>
              <Input
                className='bg-background/60'
                onChange={(e) => setFormWeiboUrl(e.target.value)}
                placeholder='https://weibo.com/...'
                value={formWeiboUrl}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label>X (Twitter)</Label>
              <Input
                className='bg-background/60'
                onChange={(e) => setFormXUrl(e.target.value)}
                placeholder='https://x.com/...'
                value={formXUrl}
              />
            </div>
          </div>
          <SheetFooter>
            {(saveMutation.isError || uploadError) && (
              <p className='text-destructive text-xs'>
                {uploadError ||
                  (saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : '保存失败')}
              </p>
            )}
            <div className='flex gap-3'>
              <SheetClose render={<Button variant='outline' />}>
                取消
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

async function prepareModelAvatar(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }

  const bitmap = await createImageBitmap(file)
  const size = Math.min(bitmap.width, bitmap.height)
  const sx = Math.floor((bitmap.width - size) / 2)
  const sy = Math.floor((bitmap.height - size) / 2)
  const outputSize = 512
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('浏览器不支持图片处理')
  }

  context.drawImage(bitmap, sx, sy, size, size, 0, 0, outputSize, outputSize)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.82),
  )

  if (!blob) {
    throw new Error('头像压缩失败')
  }

  return new File([blob], `${filenameStem(file.name)}-avatar.webp`, {
    type: 'image/webp',
  })
}

async function deleteUploadedAvatar(objectKey: string) {
  await fetch('/api/admin/models/avatar/delete', {
    body: JSON.stringify({ objectKey }),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  }).catch(() => {
    // Best-effort cleanup only; keep the original save error visible.
  })
}

function filenameStem(filename: string) {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

function publicAssetUrl(objectKey: string) {
  return `/api/assets/${objectKey.split('/').map(encodeURIComponent).join('/')}`
}
