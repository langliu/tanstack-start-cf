import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CheckSquare,
  FolderOpen,
  ImageIcon,
  ImageOff,
  Link2,
  Loader2,
  Search,
  Square,
  Star,
  Tags,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  originalFilename: string
  thumbnailUrl: string
  title: string
  width: null | number
}

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

  const albums = (albumsQuery.data as { items?: unknown[] } | undefined)?.items ?? []
  const tags = (tagsQuery.data as { items?: unknown[] } | undefined)?.items ?? []
  const models = (modelsQuery.data as { items?: unknown[] } | undefined)?.items ?? []
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
    <section className='flex min-w-0 flex-col'>
      <div className='flex min-h-14 items-center gap-2 border-[#333331] border-b bg-[#1d1e22] px-4'>
        <div className='flex items-center gap-1'>
          {FILTER_TABS.map((tab) => (
            <button
              className={cn(
                'h-7 rounded-md px-2.5 text-sm transition',
                activeFilter === tab.key
                  ? 'bg-[#73e0d3] font-semibold text-[#151615]'
                  : 'text-[#c8cbc5] hover:bg-[#2a2b2e]',
              )}
              key={tab.key}
              onClick={() =>
                navigate({
                  search: (prev) => ({ ...prev, filter: tab.key }),
                })
              }
              type='button'
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className='relative min-w-0 flex-1'>
          <Search className='-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-[#878a86]' />
          <input
            className='h-9 w-full rounded-md border border-[#343631] bg-[#151619] pr-3 pl-9 text-sm outline-none placeholder:text-[#777a75] focus:border-[#73e0d3]'
            onChange={(event) => setQuery(event.target.value)}
            placeholder='搜索'
            type='search'
            value={query}
          />
        </div>
        <label
          className={cn(
            'inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-[#73e0d3] px-3 font-semibold text-[#151615] text-sm transition hover:bg-[#8bece0]',
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
        <div className='border-[#4b3734] border-b bg-[#2a1f1f] px-4 py-2 text-[#ffb7aa] text-sm'>
          {uploadError}
        </div>
      ) : null}

      <div className='grid min-h-0 flex-1 grid-cols-[1fr_360px] overflow-hidden max-lg:grid-cols-[1fr]'>
        <ImageGrid
          images={visibleImages}
          loading={imagesQuery.isLoading}
          onFocus={setSelectedImageId}
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
    <div className='flex min-h-12 items-center gap-2 overflow-x-auto border-[#333331] border-b bg-[#191a1d] px-4 text-sm'>
      <button
        className='inline-flex h-8 items-center gap-2 rounded-md border border-[#383a37] px-2 text-[#d7d6cf] hover:bg-[#25262a]'
        onClick={onSelectAll}
        type='button'
      >
        <CheckSquare className='size-4' />
        全选
      </button>
      <span className='whitespace-nowrap text-[#a6aaa8]'>
        已选 {selectedCount}
      </span>

      <select
        className='h-8 min-w-32 rounded-md border border-[#383a37] bg-[#151619] px-2 text-sm outline-none'
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
        className='h-8 min-w-32 rounded-md border border-[#383a37] bg-[#151619] px-2 text-sm outline-none'
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
        className='h-8 min-w-32 rounded-md border border-[#383a37] bg-[#151619] px-2 text-sm outline-none'
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

      <button
        className='ml-auto inline-flex h-8 items-center gap-2 rounded-md px-2 text-[#ffb7aa] hover:bg-[#352322] disabled:opacity-40'
        disabled={disabled}
        onClick={onDelete}
        type='button'
      >
        <Trash2 className='size-4' />
        删除
      </button>
      <button
        className='inline-flex size-8 items-center justify-center rounded-md text-[#a6aaa8] hover:bg-[#25262a] disabled:opacity-40'
        disabled={disabled}
        onClick={onClear}
        title='清除选择'
        type='button'
      >
        <X className='size-4' />
      </button>
    </div>
  )
}

function ImageGrid({
  images,
  loading,
  onFocus,
  onToggle,
  selectedIds,
  selectedImageId,
}: {
  images: ImageGridItem[]
  loading: boolean
  onFocus: (id: string) => void
  onToggle: (id: string) => void
  selectedIds: Set<string>
  selectedImageId: null | string
}) {
  if (loading) {
    return (
      <div className='grid flex-1 place-items-center'>
        <Loader2 className='size-7 animate-spin text-[#73e0d3]' />
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className='grid flex-1 place-items-center text-center'>
        <div>
          <ImageOff className='mx-auto mb-3 size-10 text-[#6f736e]' />
          <p className='font-medium text-[#d7d6cf]'>暂无图片</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-0 overflow-y-auto p-4'>
      <div className='w-full columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4 min-[1800px]:columns-5 min-[2200px]:columns-6'>
        {images.map((image) => (
          <article
            className={cn(
              'group mb-4 break-inside-avoid rounded-md border border-[#343631] bg-[#202125] p-1 transition hover:border-[#656860]',
              selectedImageId === image.id && 'border-[#73e0d3]',
            )}
            key={image.id}
          >
            <div className='relative'>
              <button
                className='block w-full overflow-hidden rounded bg-[#151619]'
                onClick={() => onFocus(image.id)}
                type='button'
              >
                <img
                  alt={image.title}
                  className='h-auto w-full object-cover'
                  loading='lazy'
                  src={image.thumbnailUrl}
                />
                <span className='absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 font-semibold text-[10px] text-white uppercase'>
                  {fileExtension(image.originalFilename)}
                </span>
              </button>
              <button
                className='absolute top-2 right-2 text-white drop-shadow'
                onClick={() => onToggle(image.id)}
                title='选择图片'
                type='button'
              >
                {selectedIds.has(image.id) ? (
                  <CheckSquare className='size-5 text-[#73e0d3]' />
                ) : (
                  <Square className='size-5 opacity-0 transition group-hover:opacity-100' />
                )}
              </button>
            </div>
            <button
              className='block w-full px-1.5 pt-2 pb-1 text-left'
              onClick={() => onFocus(image.id)}
              type='button'
            >
              <p className='truncate font-medium text-[#e8e5dc] text-sm'>
                {image.title}
              </p>
              <p className='truncate text-[#9da19b] text-xs'>
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

function ImageDetailsPanel({
  albums,
  image,
  loading,
  models,
  selectedCount,
  tags,
}: {
  albums: Array<{ id: string; name: string }>
  image: null | {
    albumId: null | string
    contentType: string
    createdAt: Date | number | string
    exif: null | Record<string, unknown>
    fileSize: number
    height: null | number
    id: string
    models: Array<{ id: string; name: string }>
    note: null | string
    originalUrl: string
    rating: number
    sourceUrl: null | string
    tags: Array<{ id: string; name: string }>
    thumbnailUrl: string
    title: string
    uploadedAt: Date | number | string
    width: null | number
  }
  loading: boolean
  models: Array<{ id: string; name: string }>
  selectedCount: number
  tags: Array<{ id: string; name: string }>
}) {
  const queryClient = useQueryClient()
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
  }, [image])

  const updateMutation = useMutation({
    mutationFn: () =>
      orpc.admin.images.update.call({
        albumId: albumId || null,
        id: image?.id ?? '',
        modelIds,
        note,
        rating,
        sourceUrl,
        tagIds,
        title,
      }),
    onSuccess: () => invalidateAdminQueries(queryClient),
  })

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
        <FieldInput onChange={setTitle} placeholder='标题' value={title} />
        <textarea
          className='min-h-20 w-full resize-none rounded-md border border-[#383a37] bg-[#17181b] px-3 py-2 text-sm outline-none placeholder:text-[#777a75] focus:border-[#73e0d3]'
          onChange={(event) => setNote(event.target.value)}
          placeholder='添加注释'
          value={note}
        />
        <div className='relative'>
          <Link2 className='-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-[#878a86]' />
          <input
            className='h-9 w-full rounded-md border border-[#383a37] bg-[#17181b] pr-3 pl-9 text-sm outline-none placeholder:text-[#777a75] focus:border-[#73e0d3]'
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder='http://'
            type='url'
            value={sourceUrl}
          />
        </div>

        <section className='border-[#333331] border-t pt-4'>
          <p className='mb-2 font-semibold text-[#bfc2bd] text-sm'>评分</p>
          <div className='flex gap-1'>
            {Array.from({ length: 5 }, (_, index) => index + 1).map(
              (value) => (
                <button
                  className='text-[#686b68] hover:text-[#e7c66a]'
                  key={value}
                  onClick={() => setRating(value)}
                  type='button'
                >
                  <Star
                    className={cn(
                      'size-5',
                      value <= rating && 'fill-[#e7c66a] text-[#e7c66a]',
                    )}
                  />
                </button>
              ),
            )}
          </div>
        </section>

        <section className='border-[#333331] border-t pt-4'>
          <p className='mb-2 font-semibold text-[#bfc2bd] text-sm'>专辑</p>
          <select
            className='h-9 w-full rounded-md border border-[#383a37] bg-[#17181b] px-3 text-sm outline-none focus:border-[#73e0d3]'
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
        </section>

        <CheckList ids={tagIds} items={tags} label='标签' setIds={setTagIds} />
        <CheckList
          ids={modelIds}
          items={models}
          label='模特'
          setIds={setModelIds}
        />

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
          href={image.originalUrl}
          rel='noreferrer'
          target='_blank'
        >
          导出
        </a>
        <button
          className='inline-flex h-10 w-full items-center justify-center rounded-md bg-[#73e0d3] font-semibold text-[#151615] hover:bg-[#8bece0] disabled:opacity-60'
          disabled={updateMutation.isPending || title.trim().length === 0}
          onClick={() => updateMutation.mutate()}
          type='button'
        >
          {updateMutation.isPending ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            '保存'
          )}
        </button>
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

function CheckList({
  ids,
  items,
  label,
  setIds,
}: {
  ids: string[]
  items: Array<{ id: string; name: string }>
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
              <label
                className='flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-[#2a2b2e]'
                key={item.id}
              >
                <input
                  checked={checked}
                  onChange={() => {
                    setIds(
                      checked
                        ? ids.filter((id) => id !== item.id)
                        : [...ids, item.id],
                    )
                  }}
                  type='checkbox'
                />
                <span className='truncate'>{item.name}</span>
              </label>
            )
          })
        )}
      </div>
    </section>
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
