import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Check,
  CheckSquare,
  ImageIcon,
  ImageOff,
  Link2,
  Loader2,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Separator } from '#/components/ui/separator'
import { cn } from '#/lib/utils'
import { orpc } from '#/orpc/client'
import { ActionButton, invalidateAdminQueries } from './route'

type LibraryFilter = 'all' | 'unalbumed' | 'untagged'

const FILTER_VALUES = ['all', 'untagged', 'unalbumed'] as const

export const Route = createFileRoute('/admin/')({
  component: LibraryPage,
  validateSearch: (
    search: Record<string, string | undefined>,
  ): { filter: LibraryFilter } => ({
    filter: FILTER_VALUES.includes(search.filter as LibraryFilter)
      ? (search.filter as LibraryFilter)
      : 'all',
  }),
})

type UploadResult = {
  height?: number
  thumbnail?: File
  width?: number
}

type ImageGridItem = {
  album: { name: string } | null
  fileSize: number
  height: null | number
  id: string
  originalUrl: string
  originalFilename: string
  thumbnailUrl: string
  title: string
  width: null | number
}

type NamedOption = {
  id: string
  name: string
}

type ImageDetail = {
  albumId: null | string
  contentType: string
  createdAt: Date | number | string
  exif: null | Record<string, unknown>
  fileSize: number
  height: null | number
  id: string
  models: NamedOption[]
  note: null | string
  originalFilename: string
  originalUrl: string
  rating: number
  sourceUrl: null | string
  tags: NamedOption[]
  thumbnailUrl: string
  title: string
  uploadedAt: Date | number | string
  width: null | number
}

type ImageSaveInput = {
  albumId?: null | string
  id: string
  modelIds?: string[]
  note?: null | string
  rating?: number
  sourceUrl?: null | string
  tagIds?: string[]
  title?: string
}

type ImageSavePatch = Partial<Omit<ImageSaveInput, 'id'>>

const FILTER_TABS: { key: LibraryFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'untagged', label: '未标签' },
  { key: 'unalbumed', label: '未专辑' },
]

function LibraryPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { filter: activeFilter } = Route.useSearch()
  const [bulkAlbumId, setBulkAlbumId] = useState('')
  const [bulkModelId, setBulkModelId] = useState('')
  const [bulkTagId, setBulkTagId] = useState('')
  const [query, setQuery] = useState('')
  const [previewImage, setPreviewImage] = useState<ImageGridItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)

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

  const imagesInput = useMemo(
    () => ({
      filter: activeFilter,
      limit: 80,
      q: query || undefined,
    }),
    [activeFilter, query],
  )

  const imagesQuery = useQuery(
    orpc.admin.images.list.queryOptions({
      input: imagesInput,
    }),
  )

  const selectedImageQuery = useQuery({
    ...orpc.admin.images.detail.queryOptions({
      input: { id: selectedImageId ?? '' },
    }),
    enabled: Boolean(selectedImageId),
  })

  const addTagsMutation = useMutation({
    mutationFn: (input: { imageIds: string[]; tagIds: string[] }) =>
      orpc.admin.images.batchAddTags.call(input),
    onSuccess: () => {
      setBulkTagId('')
      invalidateAdminQueries(queryClient)
    },
  })

  const addModelsMutation = useMutation({
    mutationFn: (input: { imageIds: string[]; modelIds: string[] }) =>
      orpc.admin.images.batchAddModels.call(input),
    onSuccess: () => {
      setBulkModelId('')
      invalidateAdminQueries(queryClient)
    },
  })

  const assignAlbumMutation = useMutation({
    mutationFn: (input: { albumId: null | string; imageIds: string[] }) =>
      orpc.admin.images.batchAssignAlbum.call(input),
    onSuccess: () => {
      setBulkAlbumId('')
      invalidateAdminQueries(queryClient)
    },
  })

  const deleteImagesMutation = useMutation({
    mutationFn: (input: { imageIds: string[] }) =>
      orpc.admin.images.delete.call(input),
    onSuccess: () => {
      setSelectedIds(new Set())
      setSelectedImageId(null)
      invalidateAdminQueries(queryClient)
    },
  })

  const albums =
    (albumsQuery.data as { items?: NamedOption[] } | undefined)?.items ?? []
  const tags =
    (tagsQuery.data as { items?: NamedOption[] } | undefined)?.items ?? []
  const models =
    (modelsQuery.data as { items?: NamedOption[] } | undefined)?.items ?? []
  const imagesData = imagesQuery.data
  const visibleImages = imagesData?.items ?? []
  const selectedImage = selectedImageQuery.data ?? null
  const selectedIdList = Array.from(selectedIds)

  async function uploadFiles(files: FileList | null) {
    setUploadError('')

    if (!files || files.length === 0) {
      return
    }

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const prepared = await prepareUpload(file)
        const formData = new FormData()
        formData.append('original', file)
        if (prepared.thumbnail) {
          formData.append('thumbnail', prepared.thumbnail)
        }
        formData.append(
          'metadata',
          JSON.stringify({
            height: prepared.height,
            title: filenameStem(file.name),
            width: prepared.width,
          }),
        )

        const response = await fetch('/api/admin/images/upload', {
          body: formData,
          method: 'POST',
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(payload?.error ?? '上传失败')
        }
      }
      await invalidateAdminQueries(queryClient)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  function toggleImage(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function selectAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current)
      for (const image of visibleImages) {
        next.add(image.id)
      }
      return next
    })
  }

  return (
    <section className='flex h-full min-h-0 min-w-0 flex-col'>
      <div className='flex min-h-14 items-center gap-2 border-b bg-card px-4'>
        <div className='flex items-center gap-1'>
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.key}
              onClick={() =>
                navigate({
                  search: { filter: tab.key },
                  to: '/admin',
                })
              }
              size='sm'
              type='button'
              variant={activeFilter === tab.key ? 'default' : 'ghost'}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className='relative min-w-0 flex-1'>
          <Search className='-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground' />
          <Input
            className='h-9 bg-background/60 pr-3 pl-9'
            onChange={(event) => setQuery(event.target.value)}
            placeholder='搜索'
            type='search'
            value={query}
          />
        </div>
        <label
          className={cn(
            'inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-3 font-medium text-primary-foreground text-sm transition hover:bg-primary/90',
            uploading && 'pointer-events-none opacity-60',
          )}
          htmlFor='admin-image-upload'
        >
          {uploading ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Upload className='size-4' />
          )}
          <span className='max-sm:hidden'>上传</span>
        </label>
        <input
          accept='image/*'
          className='sr-only'
          disabled={uploading}
          id='admin-image-upload'
          multiple
          onChange={(event) => {
            void uploadFiles(event.target.files)
            event.currentTarget.value = ''
          }}
          type='file'
        />
      </div>

      <BulkToolbar
        albumId={bulkAlbumId}
        albums={albums}
        disabled={selectedIdList.length === 0}
        modelId={bulkModelId}
        models={models}
        onAddModel={() => {
          if (bulkModelId) {
            addModelsMutation.mutate({
              imageIds: selectedIdList,
              modelIds: [bulkModelId],
            })
          }
        }}
        onAddTag={() => {
          if (bulkTagId) {
            addTagsMutation.mutate({
              imageIds: selectedIdList,
              tagIds: [bulkTagId],
            })
          }
        }}
        onAssignAlbum={() => {
          assignAlbumMutation.mutate({
            albumId: bulkAlbumId || null,
            imageIds: selectedIdList,
          })
        }}
        onClear={() => setSelectedIds(new Set())}
        onDelete={() =>
          deleteImagesMutation.mutate({ imageIds: selectedIdList })
        }
        onSelectAll={selectAllVisible}
        selectedCount={selectedIdList.length}
        setAlbumId={setBulkAlbumId}
        setModelId={setBulkModelId}
        setTagId={setBulkTagId}
        tagId={bulkTagId}
        tags={tags}
      />
      {uploadError ? (
        <div className='border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-destructive text-sm'>
          {uploadError}
        </div>
      ) : null}

      <div className='grid min-h-0 flex-1 grid-cols-[1fr_360px] overflow-hidden max-lg:grid-cols-[1fr]'>
        <ImageGrid
          images={visibleImages}
          loading={imagesQuery.isLoading}
          onFocus={setSelectedImageId}
          onPreview={setPreviewImage}
          onToggle={toggleImage}
          selectedIds={selectedIds}
          selectedImageId={selectedImageId}
        />
        <ImageDetailsPanel
          albums={albums}
          image={selectedImage}
          loading={selectedImageQuery.isLoading}
          models={models}
          selectedCount={selectedIdList.length}
          tags={tags}
        />
      </div>
      <ImagePreviewDialog
        image={previewImage}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewImage(null)
          }
        }}
      />
    </section>
  )
}

function BulkToolbar({
  albumId,
  albums,
  disabled,
  modelId,
  models,
  onAddModel,
  onAddTag,
  onAssignAlbum,
  onClear,
  onDelete,
  onSelectAll,
  selectedCount,
  setAlbumId,
  setModelId,
  setTagId,
  tagId,
  tags,
}: {
  albumId: string
  albums: Array<{ id: string; name: string }>
  disabled: boolean
  modelId: string
  models: Array<{ id: string; name: string }>
  onAddModel: () => void
  onAddTag: () => void
  onAssignAlbum: () => void
  onClear: () => void
  onDelete: () => void
  onSelectAll: () => void
  selectedCount: number
  setAlbumId: (value: string) => void
  setModelId: (value: string) => void
  setTagId: (value: string) => void
  tagId: string
  tags: Array<{ id: string; name: string }>
}) {
  return (
    <div className='flex min-h-12 items-center gap-2 overflow-x-auto border-b bg-background px-4 text-sm'>
      <Button onClick={onSelectAll} size='sm' type='button' variant='outline'>
        <CheckSquare className='size-4' />
        全选
      </Button>
      <Badge className='whitespace-nowrap' variant='secondary'>
        已选 {selectedCount}
      </Badge>

      <select
        className='h-8 min-w-32 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
        onChange={(event) => setTagId(event.target.value)}
        value={tagId}
      >
        <option value=''>标签</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
      <ActionButton disabled={disabled || !tagId} onClick={onAddTag}>
        添加
      </ActionButton>

      <select
        className='h-8 min-w-32 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
        onChange={(event) => setAlbumId(event.target.value)}
        value={albumId}
      >
        <option value=''>未专辑</option>
        {albums.map((album) => (
          <option key={album.id} value={album.id}>
            {album.name}
          </option>
        ))}
      </select>
      <ActionButton disabled={disabled} onClick={onAssignAlbum}>
        移动
      </ActionButton>

      <select
        className='h-8 min-w-32 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
        onChange={(event) => setModelId(event.target.value)}
        value={modelId}
      >
        <option value=''>模特</option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
      <ActionButton disabled={disabled || !modelId} onClick={onAddModel}>
        关联
      </ActionButton>

      <Button
        className='ml-auto'
        disabled={disabled}
        onClick={onDelete}
        size='sm'
        type='button'
        variant='ghost'
      >
        <Trash2 className='size-4' />
        删除
      </Button>
      <Button
        disabled={disabled}
        onClick={onClear}
        size='icon-sm'
        title='清除选择'
        type='button'
        variant='ghost'
      >
        <X className='size-4' />
      </Button>
    </div>
  )
}

function ImageGrid({
  images,
  loading,
  onFocus,
  onPreview,
  onToggle,
  selectedIds,
  selectedImageId,
}: {
  images: ImageGridItem[]
  loading: boolean
  onFocus: (id: string) => void
  onPreview: (image: ImageGridItem) => void
  onToggle: (id: string) => void
  selectedIds: Set<string>
  selectedImageId: null | string
}) {
  if (loading) {
    return (
      <div className='grid flex-1 place-items-center'>
        <Loader2 className='size-7 animate-spin text-primary' />
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className='grid flex-1 place-items-center text-center'>
        <div>
          <ImageOff className='mx-auto mb-3 size-10 text-muted-foreground' />
          <p className='font-medium'>暂无图片</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-0 overflow-y-auto p-4'>
      <div className='w-full columns-2 gap-3 md:columns-3 lg:columns-5 xl:columns-6 2xl:columns-7 min-[1800px]:columns-8 min-[2200px]:columns-9'>
        {images.map((image) => (
          <article
            className={cn(
              'group mb-3 break-inside-avoid rounded-md border bg-card p-1 transition hover:border-ring',
              selectedImageId === image.id && 'border-primary',
            )}
            key={image.id}
          >
            <div className='relative'>
              <button
                className='block w-full overflow-hidden rounded bg-background'
                onClick={() => onFocus(image.id)}
                onDoubleClick={() => onPreview(image)}
                type='button'
              >
                <img
                  alt={image.title}
                  className='h-auto w-full object-cover'
                  loading='lazy'
                  src={image.thumbnailUrl}
                />
                <Badge
                  className='absolute top-2 left-2 uppercase'
                  variant='secondary'
                >
                  {fileExtension(image.originalFilename)}
                </Badge>
              </button>
              <Checkbox
                checked={selectedIds.has(image.id)}
                className='absolute top-2 right-2 bg-background/80 opacity-0 shadow transition group-hover:opacity-100 data-[state=checked]:opacity-100'
                onClick={() => onToggle(image.id)}
                title='选择图片'
              />
            </div>
            <button
              className='block w-full px-1.5 pt-2 pb-1 text-left'
              onClick={() => onFocus(image.id)}
              onDoubleClick={() => onPreview(image)}
              type='button'
            >
              <p className='truncate font-medium text-sm'>{image.title}</p>
              <p className='truncate text-muted-foreground text-xs'>
                {image.album?.name ?? '未专辑'} ·{' '}
                {formatFileSize(image.fileSize)}
              </p>
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

function ImagePreviewDialog({
  image,
  onOpenChange,
}: {
  image: ImageGridItem | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(image)}>
      <DialogContent
        className='top-0 left-0 h-dvh w-dvw max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-black p-0 text-white shadow-none sm:max-w-none'
        showCloseButton={false}
      >
        <DialogTitle className='sr-only'>
          {image ? `查看原图：${image.title}` : '查看原图'}
        </DialogTitle>
        <DialogDescription className='sr-only'>
          双击图片后打开的原图预览。
        </DialogDescription>
        {image ? (
          <div className='grid h-full min-h-0 place-items-center overflow-hidden bg-black p-0'>
            <Button
              className='absolute top-4 right-4 z-10 size-9 rounded-full border border-white/15 bg-black/35 text-white/80 shadow-none backdrop-blur transition hover:bg-white/10 hover:text-white focus-visible:ring-white/35'
              onClick={() => onOpenChange(false)}
              size='icon'
              title='关闭'
              type='button'
              variant='ghost'
            >
              <X className='size-5' />
            </Button>
            <img
              alt={image.title}
              className='max-h-dvh max-w-dvw object-contain'
              onDoubleClick={() => onOpenChange(false)}
              src={image.originalUrl}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ImageDetailsPanel({
  albums,
  image,
  loading,
  models,
  selectedCount,
  tags,
}: {
  albums: Array<{ id: string; name: string }>
  image: ImageDetail | null
  loading: boolean
  models: Array<{ id: string; name: string }>
  selectedCount: number
  tags: Array<{ id: string; name: string }>
}) {
  const queryClient = useQueryClient()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveError, setSaveError] = useState('')
  const [albumId, setAlbumId] = useState('')
  const [modelIds, setModelIds] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [rating, setRating] = useState(0)
  const [sourceUrl, setSourceUrl] = useState('')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [title, setTitle] = useState('')

  useEffect(() => {
    setAlbumId(image?.albumId ?? '')
    setModelIds(image?.models.map((model) => model.id) ?? [])
    setNote(image?.note ?? '')
    setRating(image?.rating ?? 0)
    setSourceUrl(image?.sourceUrl ?? '')
    setTagIds(image?.tags.map((tag) => tag.id) ?? [])
    setTitle(image?.title ?? '')
    setSaveError('')
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [image])

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    },
    [],
  )

  const updateMutation = useMutation({
    mutationFn: (input: ImageSaveInput) => orpc.admin.images.update.call(input),
    onError: (error) =>
      setSaveError(error instanceof Error ? error.message : '保存失败'),
    onSuccess: () => {
      setSaveError('')
      invalidateAdminQueries(queryClient)
    },
  })

  function buildSaveInput(patch: ImageSavePatch): ImageSaveInput | null {
    if (!image) {
      return null
    }

    if (patch.title !== undefined && patch.title.trim().length === 0) {
      return null
    }

    return {
      id: image.id,
      ...patch,
    }
  }

  function savePatch(patch: ImageSavePatch, delay = 0) {
    const input = buildSaveInput(patch)

    if (!input) {
      return
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    if (delay > 0) {
      saveTimerRef.current = setTimeout(() => {
        updateMutation.mutate(input)
        saveTimerRef.current = null
      }, delay)
      return
    }

    updateMutation.mutate(input)
  }

  if (loading) {
    return (
      <aside className='grid min-h-0 place-items-center border-[#333331] border-l bg-[#202125] max-lg:hidden'>
        <Loader2 className='size-6 animate-spin text-[#73e0d3]' />
      </aside>
    )
  }

  if (!image) {
    return (
      <aside className='min-h-0 overflow-y-auto border-[#333331] border-l bg-[#202125] p-4 max-lg:hidden'>
        <div className='grid h-full place-items-center text-center text-[#9da19b]'>
          <div>
            <ImageIcon className='mx-auto mb-3 size-9' />
            <p>
              {selectedCount > 0 ? `已选择 ${selectedCount} 张` : '选择图片'}
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className='min-h-0 overflow-y-auto border-[#333331] border-l bg-[#202125] max-lg:hidden'>
      <div className='p-4'>
        <img
          alt={image.title}
          className='mx-auto max-h-64 rounded-md object-contain'
          src={image.thumbnailUrl}
        />
      </div>
      <div className='space-y-4 px-4 pb-5'>
        <FieldInput
          onChange={(value) => {
            setTitle(value)
            savePatch({ title: value }, 650)
          }}
          placeholder='标题'
          value={title}
        />
        <textarea
          className='min-h-20 w-full resize-none rounded-md border border-[#383a37] bg-[#17181b] px-3 py-2 text-sm outline-none placeholder:text-[#777a75] focus:border-[#73e0d3]'
          onChange={(event) => {
            setNote(event.target.value)
            savePatch({ note: event.target.value }, 650)
          }}
          placeholder='添加注释'
          value={note}
        />
        <div className='relative'>
          <Link2 className='-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-[#878a86]' />
          <input
            className='h-9 w-full rounded-md border border-[#383a37] bg-[#17181b] pr-3 pl-9 text-sm outline-none placeholder:text-[#777a75] focus:border-[#73e0d3]'
            onChange={(event) => {
              setSourceUrl(event.target.value)
              savePatch({ sourceUrl: event.target.value }, 650)
            }}
            placeholder='http://'
            type='url'
            value={sourceUrl}
          />
        </div>

        <section className='border-[#333331] border-t pt-4'>
          <p className='mb-2 font-semibold text-[#bfc2bd] text-sm'>评分</p>
          <div className='flex gap-1'>
            {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
              <button
                className='text-[#686b68] hover:text-[#e7c66a]'
                key={value}
                onClick={() => {
                  setRating(value)
                  savePatch({ rating: value })
                }}
                type='button'
              >
                <Star
                  className={cn(
                    'size-5',
                    value <= rating && 'fill-[#e7c66a] text-[#e7c66a]',
                  )}
                />
              </button>
            ))}
          </div>
        </section>

        <section className='border-[#333331] border-t pt-4'>
          <p className='mb-2 font-semibold text-[#bfc2bd] text-sm'>专辑</p>
          <select
            className='h-9 w-full rounded-md border border-[#383a37] bg-[#17181b] px-3 text-sm outline-none focus:border-[#73e0d3]'
            onChange={(event) => {
              setAlbumId(event.target.value)
              savePatch({ albumId: event.target.value || null })
            }}
            value={albumId}
          >
            <option value=''>未专辑</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name}
              </option>
            ))}
          </select>
        </section>

        <TagPicker
          ids={tagIds}
          items={tags}
          label='标签'
          onChange={(nextIds) => {
            setTagIds(nextIds)
            savePatch({ tagIds: nextIds })
          }}
          saving={updateMutation.isPending}
        />
        <CheckList
          ids={modelIds}
          items={models}
          label='模特'
          setIds={(nextIds) => {
            setModelIds(nextIds)
            savePatch({ modelIds: nextIds })
          }}
        />

        {(updateMutation.isPending || saveError) && (
          <p
            className={cn(
              'text-muted-foreground text-xs',
              saveError && 'text-destructive',
            )}
          >
            {saveError || '正在保存...'}
          </p>
        )}

        <section className='border-[#333331] border-t pt-4 text-sm'>
          <p className='mb-2 font-semibold text-[#bfc2bd]'>基本信息</p>
          <InfoRow
            label='尺寸'
            value={`${image.width ?? '-'} × ${image.height ?? '-'}`}
          />
          <InfoRow label='大小' value={formatFileSize(image.fileSize)} />
          <InfoRow label='格式' value={image.contentType} />
          <InfoRow label='上传' value={formatDate(image.uploadedAt)} />
          <InfoRow label='创建' value={formatDate(image.createdAt)} />
        </section>

        <section className='border-[#333331] border-t pt-4'>
          <p className='mb-2 font-semibold text-[#bfc2bd] text-sm'>
            Exif 元数据
          </p>
          <div className='rounded-md bg-[#2a2b2e] px-3 py-3 text-center text-[#8f938e] text-sm'>
            {image.exif ? '已保存元数据' : '该文件没有相关信息'}
          </div>
        </section>

        <a
          className='inline-flex h-10 w-full items-center justify-center rounded-md bg-[#2c302f] font-medium text-[#e7e3d8] no-underline hover:bg-[#383d3a]'
          download={image.originalFilename}
          href={image.originalUrl}
        >
          导出
        </a>
      </div>
    </aside>
  )
}

function FieldInput({
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

function TagPicker({
  ids,
  items,
  label,
  onChange,
  saving,
}: {
  ids: string[]
  items: NamedOption[]
  label: string
  onChange: (ids: string[]) => void
  saving: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selectedItems = items.filter((item) => ids.includes(item.id))
  const normalizedQuery = query.trim().toLowerCase()
  const filteredItems = normalizedQuery
    ? items.filter((item) => item.name.toLowerCase().includes(normalizedQuery))
    : items

  function toggle(id: string) {
    onChange(
      ids.includes(id) ? ids.filter((itemId) => itemId !== id) : [...ids, id],
    )
  }

  return (
    <section className='border-[#333331] border-t pt-4'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <p className='font-semibold text-[#bfc2bd] text-sm'>{label}</p>
        {saving ? (
          <span className='text-muted-foreground text-xs'>保存中</span>
        ) : null}
      </div>

      {selectedItems.length > 0 ? (
        <div className='mb-2 flex flex-wrap gap-1.5'>
          {selectedItems.map((item) => (
            <button
              className='inline-flex h-7 items-center gap-1 rounded-full border border-border bg-secondary px-2.5 text-secondary-foreground text-xs transition hover:bg-accent'
              key={item.id}
              onClick={() => toggle(item.id)}
              type='button'
            >
              {item.name}
              <X className='size-3' />
            </button>
          ))}
        </div>
      ) : (
        <p className='mb-2 text-[#858883] text-sm'>暂无</p>
      )}

      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button className='w-full' type='button' variant='secondary'>
            <Plus className='size-4' />
            添加标签
          </Button>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-80 p-0'>
          <div className='border-b p-3'>
            <div className='relative'>
              <Search className='-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground' />
              <Input
                className='pl-9'
                onChange={(event) => setQuery(event.target.value)}
                placeholder='搜索标签...'
                value={query}
              />
            </div>
          </div>

          <div className='max-h-80 overflow-y-auto p-2'>
            {filteredItems.length === 0 ? (
              <p className='px-2 py-6 text-center text-muted-foreground text-sm'>
                没有匹配标签
              </p>
            ) : (
              filteredItems.map((item) => {
                const checked = ids.includes(item.id)
                return (
                  <button
                    className={cn(
                      'flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition hover:bg-accent',
                      checked && 'bg-accent',
                    )}
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    type='button'
                  >
                    <VisualCheck checked={checked} />
                    <span className='min-w-0 flex-1 truncate'>{item.name}</span>
                  </button>
                )
              })
            )}
          </div>

          <Separator />
          <div className='flex items-center justify-between px-3 py-2 text-muted-foreground text-xs'>
            <span>已选 {ids.length}</span>
            <Button
              onClick={() => setOpen(false)}
              size='xs'
              type='button'
              variant='ghost'
            >
              关闭
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </section>
  )
}

function CheckList({
  ids,
  items,
  label,
  setIds,
}: {
  ids: string[]
  items: NamedOption[]
  label: string
  setIds: (ids: string[]) => void
}) {
  return (
    <section className='border-[#333331] border-t pt-4'>
      <p className='mb-2 font-semibold text-[#bfc2bd] text-sm'>{label}</p>
      <div className='grid max-h-32 gap-1 overflow-y-auto'>
        {items.length === 0 ? (
          <p className='text-[#858883] text-sm'>暂无</p>
        ) : (
          items.map((item) => {
            const checked = ids.includes(item.id)
            return (
              <button
                className='flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-[#2a2b2e]'
                key={item.id}
                onClick={() => {
                  setIds(
                    checked
                      ? ids.filter((id) => id !== item.id)
                      : [...ids, item.id],
                  )
                }}
                type='button'
              >
                <VisualCheck checked={checked} />
                <span className='truncate'>{item.name}</span>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}

function VisualCheck({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-[4px] border border-input bg-background',
        checked && 'border-primary bg-primary text-primary-foreground',
      )}
    >
      {checked ? <Check className='size-3' /> : null}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='grid grid-cols-[72px_minmax(0,1fr)] gap-2 py-0.5'>
      <span className='text-[#a6aaa8]'>{label}</span>
      <span className='truncate text-[#e6e2d7]'>{value}</span>
    </div>
  )
}

async function prepareUpload(file: File): Promise<UploadResult> {
  try {
    const bitmap = await createImageBitmap(file)
    const maxSide = 720
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')

    if (!context) {
      bitmap.close()
      return { height: bitmap.height, width: bitmap.width }
    }

    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.82),
    )
    const result = {
      height: bitmap.height,
      thumbnail: blob
        ? new File([blob], `${filenameStem(file.name)}.webp`, {
            type: 'image/webp',
          })
        : undefined,
      width: bitmap.width,
    }
    bitmap.close()
    return result
  } catch {
    return {}
  }
}

function filenameStem(filename: string) {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

function fileExtension(filename: string) {
  const dot = filename.lastIndexOf('.')
  return dot > -1 ? filename.slice(dot + 1) : 'IMG'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
