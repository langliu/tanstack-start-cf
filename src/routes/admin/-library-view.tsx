import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  Check,
  CheckSquare,
  ImageOff,
  Link2,
  Loader2,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import {
  type RenderComponentProps,
  useMasonry,
  usePositioner,
  useResizeObserver,
} from 'masonic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Separator } from '#/components/ui/separator'
import { cn } from '#/lib/utils'
import { orpc } from '#/orpc/client'
import { ActionButton, invalidateAdminQueries } from './route'

export type LibraryFilter = 'all' | 'unalbumed' | 'untagged'
type ImageLibraryFilter = LibraryFilter | 'trash'

export const FILTER_VALUES = ['all', 'untagged', 'unalbumed'] as const

type UploadResult = {
  dominantColors?: string[]
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
  avatarObjectKey?: null | string
  id: string
  name: string
}

type ImageDetail = {
  albumId: null | string
  contentType: string
  createdAt: Date | number | string
  dominantColors: null | string[]
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

const IMAGE_PAGE_SIZE = 120
const MASONRY_COLUMN_WIDTH = 180
const MASONRY_GUTTER = 12
const MASONRY_LOAD_AHEAD = 20
const MASONRY_MAX_COLUMNS = 7
const MASONRY_OVERSCAN_BY = 2
const NO_TAG_VALUE = '__no_tag__'
const NO_ALBUM_VALUE = '__no_album__'
const NO_MODEL_VALUE = '__no_model__'

type ImageListPage = {
  items: ImageGridItem[]
  limit: number
  offset: number
  total: number
}

type ImageListData = InfiniteData<ImageListPage, number>

export function AdminImageLibrary({
  activeFilter,
  title,
}: {
  activeFilter: ImageLibraryFilter
  title?: string
}) {
  const queryClient = useQueryClient()
  const [bulkAlbumId, setBulkAlbumId] = useState('')
  const [bulkModelId, setBulkModelId] = useState('')
  const [bulkTagId, setBulkTagId] = useState('')
  const [query, setQuery] = useState('')
  const [previewImage, setPreviewImage] = useState<ImageGridItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [imageGridVersion, setImageGridVersion] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [uploadNotice, setUploadNotice] = useState('')
  const [uploading, setUploading] = useState(false)
  const selectionScopeRef = useRef({ activeFilter, imageSearchQuery: '' })

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

  const imageSearchQuery = query.trim()
  const imageListQueryKey = [
    'admin',
    'images',
    'library',
    activeFilter,
    imageSearchQuery,
  ] as const

  const imagesQuery = useInfiniteQuery<
    ImageListPage,
    Error,
    ImageListData,
    typeof imageListQueryKey,
    number
  >({
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length
      return nextOffset < lastPage.total ? nextOffset : undefined
    },
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (await orpc.admin.images.list.call({
        filter: activeFilter,
        limit: IMAGE_PAGE_SIZE,
        offset: pageParam,
        q: imageSearchQuery || undefined,
      })) as ImageListPage,
    queryKey: imageListQueryKey,
  })

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
      setImageGridVersion((version) => version + 1)
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
      setImageGridVersion((version) => version + 1)
      invalidateAdminQueries(queryClient)
    },
  })

  const deleteImagesMutation = useMutation({
    mutationFn: (input: { imageIds: string[] }) =>
      orpc.admin.images.delete.call(input),
    onSuccess: (_result, input) => {
      const deletedIds = new Set(input.imageIds)
      queryClient.setQueryData<ImageListData | undefined>(
        imageListQueryKey,
        (data) => {
          if (!data) {
            return data
          }

          return {
            ...data,
            pages: data.pages.map((page) => {
              const items = page.items.filter(
                (image) => !deletedIds.has(image.id),
              )
              return {
                ...page,
                items,
                total: Math.max(
                  0,
                  page.total - (page.items.length - items.length),
                ),
              }
            }),
          }
        },
      )
      setSelectedIds(new Set())
      setSelectedImageId(null)
      setImageGridVersion((version) => version + 1)
      invalidateAdminQueries(queryClient)
    },
  })

  const albums =
    (albumsQuery.data as { items?: NamedOption[] } | undefined)?.items ?? []
  const tags =
    (tagsQuery.data as { items?: NamedOption[] } | undefined)?.items ?? []
  const models =
    (modelsQuery.data as { items?: NamedOption[] } | undefined)?.items ?? []
  const visibleImages = useMemo(
    () => imagesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [imagesQuery.data],
  )
  const selectedImage = selectedImageQuery.data ?? null
  const isDetailsOpen = Boolean(selectedImageId)
  const isTrashFilter = activeFilter === 'trash'
  const selectedIdList = Array.from(selectedIds)

  useEffect(() => {
    const previousScope = selectionScopeRef.current
    if (
      previousScope.activeFilter === activeFilter &&
      previousScope.imageSearchQuery === imageSearchQuery
    ) {
      return
    }

    selectionScopeRef.current = { activeFilter, imageSearchQuery }
    setSelectedIds(new Set())
    setSelectedImageId(null)
  }, [activeFilter, imageSearchQuery])

  async function uploadFiles(files: FileList | null) {
    setUploadError('')
    setUploadNotice('')

    if (!files || files.length === 0) {
      return
    }

    setUploading(true)
    try {
      let skippedDuplicates = 0
      const uploadedChecksums = new Set<string>()

      for (const file of Array.from(files)) {
        const checksumSha256 = await sha256File(file)
        if (uploadedChecksums.has(checksumSha256)) {
          skippedDuplicates += 1
          continue
        }

        const existingImage = await orpc.admin.images.findByChecksum.call({
          checksumSha256,
        })
        if (existingImage) {
          skippedDuplicates += 1
          uploadedChecksums.add(checksumSha256)
          continue
        }

        const prepared = await prepareUpload(file)
        const formData = new FormData()
        formData.append('original', file)
        if (prepared.thumbnail) {
          formData.append('thumbnail', prepared.thumbnail)
        }
        formData.append(
          'metadata',
          JSON.stringify({
            dominantColors: prepared.dominantColors,
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

        const payload = (await response.json().catch(() => null)) as {
          duplicate?: boolean
        } | null
        if (payload?.duplicate) {
          skippedDuplicates += 1
        }
        uploadedChecksums.add(checksumSha256)
      }
      await invalidateAdminQueries(queryClient)
      setImageGridVersion((version) => version + 1)
      if (skippedDuplicates > 0) {
        setUploadNotice(`已跳过 ${skippedDuplicates} 张重复图片`)
      }
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
        {isTrashFilter ? (
          <h1 className='font-semibold text-sm'>{title ?? '回收站'}</h1>
        ) : null}
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
        {isTrashFilter ? null : (
          <>
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
          </>
        )}
      </div>

      <BulkToolbar
        albumId={bulkAlbumId}
        albums={albums}
        disabled={selectedIdList.length === 0}
        isTrashFilter={isTrashFilter}
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
      {uploadNotice ? (
        <div className='border-b border-[#73e0d3]/30 bg-[#73e0d3]/10 px-4 py-2 text-[#9de9df] text-sm'>
          {uploadNotice}
        </div>
      ) : null}

      <div
        className={cn(
          'grid min-h-0 flex-1 overflow-hidden max-lg:grid-cols-[1fr]',
          isDetailsOpen ? 'grid-cols-[1fr_360px]' : 'grid-cols-[1fr]',
        )}
      >
        <ImageGrid
          emptyMessage={isTrashFilter ? '回收站为空' : '暂无图片'}
          hasNextPage={imagesQuery.hasNextPage}
          images={visibleImages}
          isFetchingNextPage={imagesQuery.isFetchingNextPage}
          loading={imagesQuery.isLoading}
          onFocus={setSelectedImageId}
          onLoadMore={() => void imagesQuery.fetchNextPage()}
          onPreview={setPreviewImage}
          onToggle={toggleImage}
          resetKey={`${activeFilter}:${imageSearchQuery}:${imageGridVersion}`}
          selectedIds={selectedIds}
          selectedImageId={selectedImageId}
        />
        {isDetailsOpen ? (
          <ImageDetailsPanel
            albums={albums}
            image={selectedImage}
            loading={selectedImageQuery.isLoading}
            models={models}
            onClose={() => setSelectedImageId(null)}
            tags={tags}
          />
        ) : null}
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
  isTrashFilter,
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
  isTrashFilter: boolean
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
  const tagSelectItems = [
    { label: '标签', value: NO_TAG_VALUE },
    ...tags.map((tag) => ({ label: tag.name, value: tag.id })),
  ]
  const albumSelectItems = [
    { label: '未专辑', value: NO_ALBUM_VALUE },
    ...albums.map((album) => ({ label: album.name, value: album.id })),
  ]
  const modelSelectItems = [
    { label: '模特', value: NO_MODEL_VALUE },
    ...models.map((model) => ({ label: model.name, value: model.id })),
  ]

  return (
    <div className='flex min-h-12 items-center gap-2 overflow-x-auto border-b bg-background px-4 text-sm'>
      <Button onClick={onSelectAll} size='sm' type='button' variant='outline'>
        <CheckSquare className='size-4' />
        全选
      </Button>
      <Badge className='whitespace-nowrap' variant='secondary'>
        已选 {selectedCount}
      </Badge>

      {isTrashFilter ? null : (
        <>
          <Select
            items={tagSelectItems}
            onValueChange={(value) => {
              if (value === null) {
                return
              }

              setTagId(value === NO_TAG_VALUE ? '' : value)
            }}
            value={tagId || NO_TAG_VALUE}
          >
            <SelectTrigger className='h-8 min-w-32 bg-background'>
              <SelectValue placeholder='标签' />
            </SelectTrigger>
            <SelectContent className='admin-shell'>
              <SelectGroup>
                <SelectItem value={NO_TAG_VALUE}>标签</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ActionButton disabled={disabled || !tagId} onClick={onAddTag}>
            添加
          </ActionButton>

          <Select
            items={albumSelectItems}
            onValueChange={(value) => {
              if (value === null) {
                return
              }

              setAlbumId(value === NO_ALBUM_VALUE ? '' : value)
            }}
            value={albumId || NO_ALBUM_VALUE}
          >
            <SelectTrigger className='h-8 min-w-32 bg-background'>
              <SelectValue placeholder='未专辑' />
            </SelectTrigger>
            <SelectContent className='admin-shell'>
              <SelectGroup>
                <SelectItem value={NO_ALBUM_VALUE}>未专辑</SelectItem>
                {albums.map((album) => (
                  <SelectItem key={album.id} value={album.id}>
                    {album.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ActionButton disabled={disabled} onClick={onAssignAlbum}>
            移动
          </ActionButton>

          <Select
            items={modelSelectItems}
            onValueChange={(value) => {
              if (value === null) {
                return
              }

              setModelId(value === NO_MODEL_VALUE ? '' : value)
            }}
            value={modelId || NO_MODEL_VALUE}
          >
            <SelectTrigger className='h-8 min-w-32 bg-background'>
              <SelectValue placeholder='模特' />
            </SelectTrigger>
            <SelectContent className='admin-shell'>
              <SelectGroup>
                <SelectItem value={NO_MODEL_VALUE}>模特</SelectItem>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ActionButton disabled={disabled || !modelId} onClick={onAddModel}>
            关联
          </ActionButton>
        </>
      )}

      <Button
        className='ml-auto'
        disabled={disabled}
        onClick={onDelete}
        size='sm'
        type='button'
        variant='ghost'
      >
        <Trash2 className='size-4' />
        {isTrashFilter ? '彻底删除' : '删除'}
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
  emptyMessage,
  hasNextPage,
  images,
  isFetchingNextPage,
  loading,
  onFocus,
  onLoadMore,
  onPreview,
  onToggle,
  resetKey,
  selectedIds,
  selectedImageId,
}: {
  emptyMessage: string
  hasNextPage: boolean
  images: ImageGridItem[]
  isFetchingNextPage: boolean
  loading: boolean
  onFocus: (id: string) => void
  onLoadMore: () => void
  onPreview: (image: ImageGridItem) => void
  onToggle: (id: string) => void
  resetKey: string
  selectedIds: Set<string>
  selectedImageId: null | string
}) {
  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null)
  const masonryRef = useRef<HTMLElement | null>(null)
  const handleContainerRef = useCallback(
    (element: HTMLDivElement | null) => setContainerElement(element),
    [],
  )
  const containerSize = useElementSize(containerElement)
  const { handleScroll, isScrolling, scrollTop } =
    useElementScrollState(containerElement)
  const positioner = usePositioner(
    {
      columnGutter: MASONRY_GUTTER,
      columnWidth: MASONRY_COLUMN_WIDTH,
      maxColumnCount: MASONRY_MAX_COLUMNS,
      rowGutter: MASONRY_GUTTER,
      width: Math.max(1, containerSize.width - 32),
    },
    [resetKey],
  )
  const resizeObserver = useResizeObserver(positioner)
  const renderCard = useCallback(
    ({ data: image, width }: RenderComponentProps<ImageGridItem>) =>
      image ? (
        <ImageMasonryCard
          checked={selectedIds.has(image.id)}
          image={image}
          onFocus={onFocus}
          onPreview={onPreview}
          onToggle={onToggle}
          selected={selectedImageId === image.id}
          width={width}
        />
      ) : (
        <div aria-hidden style={{ width }} />
      ),
    [onFocus, onPreview, onToggle, selectedIds, selectedImageId],
  )
  const handleRender = useCallback(
    (_startIndex: number, stopIndex: number) => {
      if (
        hasNextPage &&
        !isFetchingNextPage &&
        stopIndex >= images.length - MASONRY_LOAD_AHEAD
      ) {
        onLoadMore()
      }
    },
    [hasNextPage, images.length, isFetchingNextPage, onLoadMore],
  )
  const masonry = useMasonry({
    className: 'relative w-full outline-none',
    containerRef: masonryRef,
    height: Math.max(1, containerSize.height),
    isScrolling,
    itemHeightEstimate: 220,
    itemKey: (image, index) => image?.id ?? `missing-${resetKey}-${index}`,
    items: images,
    onRender: handleRender,
    overscanBy: MASONRY_OVERSCAN_BY,
    positioner,
    render: renderCard,
    resizeObserver,
    role: 'list',
    scrollTop,
    tabIndex: -1,
  })

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
          <p className='font-medium'>{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className='min-h-0 overflow-y-auto p-4'
      onScroll={handleScroll}
      ref={handleContainerRef}
    >
      {masonry}
      <div className='grid min-h-12 place-items-center pt-3 text-muted-foreground text-sm'>
        {isFetchingNextPage ? (
          <span className='inline-flex items-center gap-2'>
            <Loader2 className='size-4 animate-spin' />
            加载更多
          </span>
        ) : hasNextPage ? (
          <span>继续向下滚动加载</span>
        ) : (
          <span>已加载全部</span>
        )}
      </div>
    </div>
  )
}

function ImageMasonryCard({
  checked,
  image,
  onFocus,
  onPreview,
  onToggle,
  selected,
  width,
}: {
  checked: boolean
  image: ImageGridItem
  onFocus: (id: string) => void
  onPreview: (image: ImageGridItem) => void
  onToggle: (id: string) => void
  selected: boolean
  width: number
}) {
  return (
    <article
      className={cn(
        'group rounded-md border border-transparent bg-transparent p-0 transition hover:border-ring',
        selected && 'border-primary ring-1 ring-primary',
      )}
      style={{ width }}
    >
      <div className='relative'>
        <button
          className='block w-full overflow-hidden rounded-md bg-background'
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
        </button>
        <Checkbox
          checked={checked}
          className='absolute top-2 right-2 bg-background/80 opacity-0 shadow transition group-hover:opacity-100 data-[state=checked]:opacity-100'
          onClick={() => onToggle(image.id)}
          title='选择图片'
        />
      </div>
    </article>
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
  onClose,
  tags,
}: {
  albums: Array<{ id: string; name: string }>
  image: ImageDetail | null
  loading: boolean
  models: Array<{ id: string; name: string }>
  onClose: () => void
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
  const albumSelectItems = [
    { label: '未专辑', value: NO_ALBUM_VALUE },
    ...albums.map((album) => ({ label: album.name, value: album.id })),
  ]

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
      <aside className='relative grid min-h-0 place-items-center border-[#333331] border-l bg-[#202125] max-lg:hidden'>
        <Button
          className='absolute top-3 right-3 text-[#bfc2bd] hover:bg-[#2a2b2e] hover:text-[#f4f0e7]'
          onClick={onClose}
          size='icon-sm'
          title='关闭详情'
          type='button'
          variant='ghost'
        >
          <X className='size-4' />
        </Button>
        <Loader2 className='size-6 animate-spin text-[#73e0d3]' />
      </aside>
    )
  }

  if (!image) {
    return null
  }

  return (
    <aside className='min-h-0 overflow-y-auto border-[#333331] border-l bg-[#202125] max-lg:hidden'>
      <div className='flex items-center justify-end px-3 pt-3'>
        <Button
          className='text-[#bfc2bd] hover:bg-[#2a2b2e] hover:text-[#f4f0e7]'
          onClick={onClose}
          size='icon-sm'
          title='关闭详情'
          type='button'
          variant='ghost'
        >
          <X className='size-4' />
        </Button>
      </div>
      <div className='px-4 pt-1 pb-4'>
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

        {image.dominantColors?.length ? (
          <section className='border-[#333331] border-t pt-4'>
            <p className='mb-3 font-semibold text-[#bfc2bd] text-sm'>
              主要色彩
            </p>
            <div className='flex flex-wrap gap-2'>
              {image.dominantColors.map((color) => (
                <span
                  className='size-6 rounded-full border border-white/15 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]'
                  key={color}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className='border-[#333331] border-t pt-4'>
          <p className='mb-2 font-semibold text-[#bfc2bd] text-sm'>专辑</p>
          <Select
            items={albumSelectItems}
            onValueChange={(value) => {
              if (value === null) {
                return
              }

              const nextAlbumId = value === NO_ALBUM_VALUE ? '' : value
              setAlbumId(nextAlbumId)
              savePatch({ albumId: nextAlbumId || null })
            }}
            value={albumId || NO_ALBUM_VALUE}
          >
            <SelectTrigger className='h-9 w-full border-[#383a37] bg-[#17181b] text-[#e7e3d8] shadow-none focus-visible:border-[#73e0d3] focus-visible:ring-[#73e0d3]/40'>
              <SelectValue placeholder='未专辑' />
            </SelectTrigger>
            <SelectContent className='border-[#383a37] bg-[#17181b] text-[#e7e3d8]'>
              <SelectGroup>
                <SelectItem value={NO_ALBUM_VALUE}>未专辑</SelectItem>
                {albums.map((album) => (
                  <SelectItem key={album.id} value={album.id}>
                    {album.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
        <ModelPicker
          ids={modelIds}
          items={models}
          label='模特'
          onChange={(nextIds) => {
            setModelIds(nextIds)
            savePatch({ modelIds: nextIds })
          }}
          saving={updateMutation.isPending}
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
      className='h-9 min-w-0 w-full rounded-md border border-[#383a37] bg-[#17181b] px-3 text-sm outline-none placeholder:text-[#777a75] focus:border-[#73e0d3]'
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
        <PopoverTrigger
          render={
            <Button className='w-full' type='button' variant='secondary' />
          }
        >
          <Plus className='size-4' />
          添加标签
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

function ModelPicker({
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
              className='inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-border bg-secondary py-0 pr-2.5 pl-1 text-secondary-foreground text-xs transition hover:bg-accent'
              key={item.id}
              onClick={() => toggle(item.id)}
              type='button'
            >
              <ModelAvatar className='size-6' model={item} />
              <span className='truncate'>{item.name}</span>
              <X className='size-3 shrink-0' />
            </button>
          ))}
        </div>
      ) : (
        <p className='mb-2 text-[#858883] text-sm'>暂无</p>
      )}

      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <Button className='w-full' type='button' variant='secondary' />
          }
        >
          <Plus className='size-4' />
          添加模特
        </PopoverTrigger>
        <PopoverContent align='start' className='w-80 p-0'>
          <div className='border-b p-3'>
            <div className='relative'>
              <Search className='-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground' />
              <Input
                className='pl-9'
                onChange={(event) => setQuery(event.target.value)}
                placeholder='搜索模特...'
                value={query}
              />
            </div>
          </div>

          <div className='max-h-80 overflow-y-auto p-2'>
            {filteredItems.length === 0 ? (
              <p className='px-2 py-6 text-center text-muted-foreground text-sm'>
                没有匹配模特
              </p>
            ) : (
              filteredItems.map((item) => {
                const checked = ids.includes(item.id)
                return (
                  <button
                    className={cn(
                      'flex h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition hover:bg-accent',
                      checked && 'bg-accent',
                    )}
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    type='button'
                  >
                    <VisualCheck checked={checked} />
                    <ModelAvatar className='size-8' model={item} />
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

function ModelAvatar({
  className,
  model,
}: {
  className?: string
  model: NamedOption
}) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-background',
        className,
      )}
    >
      {model.avatarObjectKey ? (
        <img
          alt={model.name}
          className='size-full object-cover'
          src={publicAssetUrl(model.avatarObjectKey)}
        />
      ) : (
        <UserRound className='size-4 text-muted-foreground' />
      )}
    </span>
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

function useElementSize(element: HTMLElement | null) {
  const [size, setSize] = useState({ height: 0, width: 0 })

  useEffect(() => {
    if (!element) {
      return
    }

    const target = element

    function updateSize() {
      setSize({
        height: target.clientHeight,
        width: target.clientWidth,
      })
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(updateSize)
    observer.observe(target)

    return () => observer.disconnect()
  }, [element])

  return size
}

function useElementScrollState(element: HTMLElement | null) {
  const frameRef = useRef<number | null>(null)
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)

  const handleScroll = useCallback(() => {
    if (!element || frameRef.current !== null) {
      return
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      setScrollTop(element?.scrollTop ?? 0)
      setIsScrolling(true)

      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current)
      }

      scrollEndTimerRef.current = setTimeout(() => {
        setIsScrolling(false)
        scrollEndTimerRef.current = null
      }, 120)
    })
  }, [element])

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current)
      }
    },
    [],
  )

  return { handleScroll, isScrolling, scrollTop }
}

async function prepareUpload(file: File): Promise<UploadResult> {
  try {
    const bitmap = await createImageBitmap(file)
    const dominantColors = extractDominantColors(bitmap)
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
      return { dominantColors, height: bitmap.height, width: bitmap.width }
    }

    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.82),
    )
    const result = {
      dominantColors,
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

function extractDominantColors(bitmap: ImageBitmap) {
  try {
    const maxSide = 64
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      return []
    }

    context.drawImage(bitmap, 0, 0, width, height)
    const data = context.getImageData(0, 0, width, height).data
    const buckets = new Map<
      string,
      { blue: number; count: number; green: number; red: number }
    >()
    const bucketSize = 32

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3]
      if (alpha < 128) {
        continue
      }

      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]
      const key = [
        Math.floor(red / bucketSize),
        Math.floor(green / bucketSize),
        Math.floor(blue / bucketSize),
      ].join(':')
      const bucket = buckets.get(key) ?? {
        blue: 0,
        count: 0,
        green: 0,
        red: 0,
      }

      bucket.red += red
      bucket.green += green
      bucket.blue += blue
      bucket.count += 1
      buckets.set(key, bucket)
    }

    const selected: Array<{ blue: number; green: number; red: number }> = []

    for (const bucket of Array.from(buckets.values()).sort(
      (left, right) => right.count - left.count,
    )) {
      const color = {
        blue: Math.round(bucket.blue / bucket.count),
        green: Math.round(bucket.green / bucket.count),
        red: Math.round(bucket.red / bucket.count),
      }

      if (selected.some((existing) => colorDistance(existing, color) < 48)) {
        continue
      }

      selected.push(color)
      if (selected.length >= 7) {
        break
      }
    }

    return selected.map(rgbToHex)
  } catch {
    return []
  }
}

function colorDistance(
  left: { blue: number; green: number; red: number },
  right: { blue: number; green: number; red: number },
) {
  return Math.hypot(
    left.red - right.red,
    left.green - right.green,
    left.blue - right.blue,
  )
}

function rgbToHex(color: { blue: number; green: number; red: number }) {
  return `#${[color.red, color.green, color.blue]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

async function sha256File(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function filenameStem(filename: string) {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
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

function publicAssetUrl(objectKey: string) {
  return `/api/assets/${objectKey.split('/').map(encodeURIComponent).join('/')}`
}
