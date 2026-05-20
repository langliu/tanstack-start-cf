import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, FolderOpen, ImageIcon, Loader2 } from 'lucide-react'
import {
  type RenderComponentProps,
  useMasonry,
  usePositioner,
  useResizeObserver,
} from 'masonic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { cn } from '#/lib/utils'
import { orpc } from '#/orpc/client'
import { invalidateAdminQueries } from '../route'

export const Route = createFileRoute('/admin/albums/$albumId')({
  component: AlbumDetailPage,
})

const MASONRY_COLUMN_WIDTH = 180
const MASONRY_GUTTER = 12
const MASONRY_MAX_COLUMNS = 7
const MASONRY_OVERSCAN_BY = 2

type AlbumImage = {
  height?: number | null
  id: string
  thumbnailUrl: string
  title: string
  width?: number | null
}

function AlbumDetailPage() {
  const { albumId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const albumQuery = useQuery(
    orpc.admin.albums.detail.queryOptions({ input: { id: albumId } }),
  )
  const imagesQuery = useQuery(
    orpc.admin.images.list.queryOptions({
      input: { albumId, limit: 120, offset: 0 },
    }),
  )

  const album = albumQuery.data as
    | {
        agency?: { id: string; name: string } | null
        coverImageId?: string | null
        id: string
        name: string
        sortOrder: number
      }
    | undefined
    | null

  const imagesData = imagesQuery.data as
    | {
        items?: AlbumImage[]
        total?: number
      }
    | undefined

  const images = imagesData?.items ?? []
  const setCoverMutation = useMutation({
    mutationFn: (imageId: string) =>
      orpc.admin.albums.setCover.call({ albumId, imageId }),
    onSuccess: () => invalidateAdminQueries(queryClient),
  })

  if (albumQuery.isLoading) {
    return (
      <section className='flex h-full min-h-0 min-w-0 flex-col'>
        <div className='flex h-full items-center justify-center'>
          <Loader2 className='size-7 animate-spin text-[#73e0d3]' />
        </div>
      </section>
    )
  }

  if (!album) {
    return (
      <section className='flex h-full min-h-0 min-w-0 flex-col'>
        <div className='flex min-h-14 items-center gap-3 border-[#333331] border-b bg-[#1d1e22] px-4'>
          <Button
            onClick={() => navigate({ to: '/admin/albums' })}
            size='icon-sm'
            type='button'
            variant='ghost'
          >
            <ArrowLeft className='size-4' />
          </Button>
          <h1 className='font-semibold text-base'>专辑未找到</h1>
        </div>
        <div className='grid place-items-center py-16 text-muted-foreground text-sm'>
          该专辑不存在或已被删除
        </div>
      </section>
    )
  }

  return (
    <section className='flex h-full min-h-0 min-w-0 flex-col'>
      <div className='flex min-h-14 items-center gap-3 border-b bg-card px-4'>
        <Button
          onClick={() => navigate({ to: '/admin/albums' })}
          size='icon-sm'
          type='button'
          variant='ghost'
        >
          <ArrowLeft className='size-4' />
        </Button>
        <FolderOpen className='size-5 text-primary' />
        <h1 className='font-semibold text-base'>{album.name}</h1>
        {album.agency && <Badge variant='secondary'>{album.agency.name}</Badge>}
        <span className='ml-auto text-muted-foreground text-xs'>
          {imagesData?.total ?? 0} 张图片
        </span>
      </div>
      <div className='min-h-0 flex-1 overflow-hidden p-4'>
        {imagesQuery.isLoading ? (
          <div className='grid place-items-center py-16'>
            <Loader2 className='size-7 animate-spin text-primary' />
          </div>
        ) : images.length === 0 ? (
          <div className='grid place-items-center py-16 text-muted-foreground text-sm'>
            暂无图片
          </div>
        ) : (
          <AlbumMasonryGrid
            coverImageId={album.coverImageId ?? null}
            images={images}
            onSetCover={(imageId) => setCoverMutation.mutate(imageId)}
            resetKey={albumId}
            settingCoverImageId={
              setCoverMutation.isPending
                ? (setCoverMutation.variables ?? null)
                : null
            }
          />
        )}
      </div>
    </section>
  )
}

function AlbumMasonryGrid({
  coverImageId,
  images,
  onSetCover,
  resetKey,
  settingCoverImageId,
}: {
  coverImageId: null | string
  images: AlbumImage[]
  onSetCover: (imageId: string) => void
  resetKey: string
  settingCoverImageId: null | string
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
      width: Math.max(1, containerSize.width),
    },
    [resetKey],
  )
  const resizeObserver = useResizeObserver(positioner)
  const renderCard = useCallback(
    ({ data: image, width }: RenderComponentProps<AlbumImage>) =>
      image ? (
        <AlbumMasonryCard
          image={image}
          isCover={coverImageId === image.id}
          onSetCover={onSetCover}
          settingCover={settingCoverImageId === image.id}
          width={width}
        />
      ) : (
        <div aria-hidden style={{ width }} />
      ),
    [coverImageId, onSetCover, settingCoverImageId],
  )
  const masonry = useMasonry({
    className: 'relative w-full outline-none',
    containerRef: masonryRef,
    height: Math.max(1, containerSize.height),
    isScrolling,
    itemHeightEstimate: 220,
    itemKey: (image, index) => image?.id ?? `missing-${resetKey}-${index}`,
    items: images,
    overscanBy: MASONRY_OVERSCAN_BY,
    positioner,
    render: renderCard,
    resizeObserver,
    role: 'list',
    scrollTop,
    tabIndex: -1,
  })

  return (
    <div
      className='h-full min-h-0 overflow-y-auto'
      onScroll={handleScroll}
      ref={handleContainerRef}
    >
      {masonry}
    </div>
  )
}

function AlbumMasonryCard({
  image,
  isCover,
  onSetCover,
  settingCover,
  width,
}: {
  image: AlbumImage
  isCover: boolean
  onSetCover: (imageId: string) => void
  settingCover: boolean
  width: number
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <article
            className={cn(
              'group rounded-md border border-transparent bg-transparent p-0 transition hover:border-ring',
              isCover && 'border-primary ring-1 ring-primary',
            )}
            style={{ width }}
          />
        }
      >
        <div className='relative overflow-hidden rounded-md bg-background'>
          {image.thumbnailUrl ? (
            <img
              alt={image.title}
              className='h-auto w-full object-cover'
              loading='lazy'
              src={image.thumbnailUrl}
            />
          ) : (
            <div
              className={cn(
                'grid w-full place-items-center bg-background text-muted-foreground text-xs',
                'aspect-[3/4]',
              )}
            >
              无预览
            </div>
          )}
          {isCover ? (
            <Badge className='absolute top-2 left-2 gap-1 shadow-sm'>
              <ImageIcon className='size-3' />
              封面
            </Badge>
          ) : null}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className='admin-shell'>
        <ContextMenuItem
          disabled={isCover || settingCover}
          onClick={() => onSetCover(image.id)}
        >
          <ImageIcon className='size-4' />
          {isCover
            ? '已是专辑封面'
            : settingCover
              ? '正在设置...'
              : '设为专辑封面'}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
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
