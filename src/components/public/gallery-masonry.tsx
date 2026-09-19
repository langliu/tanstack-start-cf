import { Link } from '@tanstack/react-router'
import { ExternalLink, ImageIcon, Maximize2 } from 'lucide-react'
import { Masonry, type RenderComponentProps, useInfiniteLoader } from 'masonic'
import { useCallback, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '#/components/ui/dialog'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'

export type PublicGalleryImage = {
  album: null | {
    name: string
    slug: string
  }
  agency: null | {
    name: string
  }
  dominantColors: null | string[]
  height: null | number
  id: string
  models: {
    alias: null | string
    id: string
    name: string
  }[]
  originalUrl: string
  tags: {
    color: null | string
    id: string
    name: string
    slug: string
  }[]
  thumbnailUrl: string
  title: string
  uploadedAt: Date | number | string
  width: null | number
}

export function GalleryMasonry({
  className,
  emptyDescription = '当前没有可以展示的图片',
  emptyTitle = '暂无图片',
  hasMore,
  isLoadingMore,
  items,
  onLoadMore,
  showAlbumLink = true,
  total,
}: {
  className?: string
  emptyDescription?: string
  emptyTitle?: string
  hasMore: boolean
  isLoadingMore: boolean
  items: PublicGalleryImage[]
  onLoadMore: () => void
  showAlbumLink?: boolean
  total: number
}) {
  const [previewImage, setPreviewImage] = useState<PublicGalleryImage | null>(
    null,
  )
  const maybeLoadMore = useInfiniteLoader(
    useCallback(() => {
      if (hasMore && !isLoadingMore) {
        onLoadMore()
      }
    }, [hasMore, isLoadingMore, onLoadMore]),
    {
      isItemLoaded: (index, currentItems: PublicGalleryImage[]) =>
        Boolean(currentItems[index]),
      minimumBatchSize: 24,
      threshold: 18,
      totalItems: total,
    },
  )
  const renderCard = useCallback(
    (props: RenderComponentProps<PublicGalleryImage>) => (
      <GalleryMasonryCard
        {...props}
        onOpen={setPreviewImage}
        showAlbumLink={showAlbumLink}
      />
    ),
    [showAlbumLink],
  )

  if (items.length === 0 && !isLoadingMore) {
    return (
      <div className='grid min-h-80 place-items-center rounded-md border border-dashed border-(--line) bg-(--surface-muted) p-8 text-center'>
        <div className='flex max-w-sm flex-col items-center gap-3'>
          <span className='grid size-12 place-items-center rounded-md bg-(--accent-soft) text-(--accent-strong)'>
            <ImageIcon aria-hidden='true' />
          </span>
          <h2 className='m-0 font-semibold text-(--sea-ink) text-lg'>
            {emptyTitle}
          </h2>
          <p className='m-0 text-sm text-(--sea-ink-soft)'>
            {emptyDescription}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={cn('gallery-masonry', className)}>
        <Masonry
          columnGutter={18}
          columnWidth={220}
          itemHeightEstimate={300}
          itemKey={(image) => image.id}
          items={items}
          maxColumnCount={6}
          onRender={maybeLoadMore}
          overscanBy={2}
          render={renderCard}
          role='list'
          rowGutter={18}
          ssrHeight={900}
          ssrWidth={1080}
          tabIndex={-1}
        />
      </div>
      <div className='mt-8 flex justify-center'>
        {hasMore ? (
          <Button
            disabled={isLoadingMore}
            onClick={onLoadMore}
            type='button'
            variant='outline'
          >
            {isLoadingMore ? '加载中' : '加载更多'}
          </Button>
        ) : (
          <p className='m-0 text-sm text-(--sea-ink-soft)'>
            已展示全部 {total} 张
          </p>
        )}
      </div>
      <ImagePreviewDialog
        image={previewImage}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewImage(null)
          }
        }}
      />
    </>
  )
}

function GalleryMasonryCard({
  data: image,
  onOpen,
  showAlbumLink,
  width,
}: RenderComponentProps<PublicGalleryImage> & {
  onOpen: (image: PublicGalleryImage) => void
  showAlbumLink: boolean
}) {
  const color = image.dominantColors?.[0] ?? 'var(--surface-muted)'

  return (
    <article
      className='group overflow-hidden rounded-md border border-(--line) bg-(--surface-strong) shadow-[0_14px_36px_rgba(27,34,46,0.08)]'
      style={{ width }}
    >
      <button
        className='block w-full cursor-zoom-in border-0 bg-transparent p-0 text-left'
        onClick={() => onOpen(image)}
        type='button'
      >
        <span
          className='relative block overflow-hidden rounded-t-[5px]'
          style={{ background: color }}
        >
          {image.thumbnailUrl ? (
            <img
              alt={image.title}
              className='block h-auto w-full transition duration-500 group-hover:scale-[1.035]'
              decoding='async'
              height={image.height ?? undefined}
              loading='lazy'
              src={image.thumbnailUrl}
              width={image.width ?? undefined}
            />
          ) : (
            <span className='grid aspect-4/5 place-items-center text-(--sea-ink-soft)'>
              <ImageIcon aria-hidden='true' />
            </span>
          )}
          <span className='absolute right-2 bottom-2 grid size-8 translate-y-2 place-items-center rounded-md bg-black/55 text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100'>
            <Maximize2 aria-hidden='true' />
          </span>
        </span>
      </button>
      <div className='flex flex-col gap-2 p-3'>
        <div className='flex items-start justify-between gap-3'>
          <h3 className='m-0 min-w-0 font-semibold text-(--sea-ink) text-sm leading-5'>
            <button
              className='line-clamp-2 border-0 bg-transparent p-0 text-left text-inherit'
              onClick={() => onOpen(image)}
              type='button'
            >
              {image.title}
            </button>
          </h3>
        </div>
        {showAlbumLink && image.album ? (
          <Link
            className='truncate text-(--accent-strong) text-xs font-semibold no-underline hover:underline'
            params={{ albumSlug: image.album.slug }}
            to='/albums/$albumSlug'
          >
            {image.album.name}
          </Link>
        ) : null}
        {image.tags.length > 0 ? (
          <div className='flex flex-wrap gap-1.5'>
            {image.tags.slice(0, 3).map((tag) => (
              <Badge
                className='max-w-full truncate'
                key={tag.id}
                variant='secondary'
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function ImagePreviewDialog({
  image,
  onOpenChange,
}: {
  image: PublicGalleryImage | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={Boolean(image)}>
      <DialogContent className='max-h-[calc(100vh-2rem)] overflow-y-auto bg-(--surface-strong) p-0 sm:max-w-5xl'>
        {image ? (
          <div className='grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]'>
            <div className='grid min-h-80 place-items-center bg-[#101318]'>
              <img
                alt={image.title}
                className='max-h-[78vh] w-full object-contain'
                decoding='async'
                src={image.originalUrl}
              />
            </div>
            <aside className='flex flex-col gap-4 p-5'>
              <div className='flex flex-col gap-2'>
                <DialogTitle className='text-(--sea-ink) text-xl leading-7'>
                  {image.title}
                </DialogTitle>
                <DialogDescription>
                  {formatDate(image.uploadedAt)}
                  {image.agency ? ` · ${image.agency.name}` : ''}
                </DialogDescription>
              </div>
              {image.album ? (
                <Link
                  className='inline-flex min-h-9 items-center justify-center rounded-md border border-(--line) bg-(--surface-muted) px-3 font-semibold text-(--sea-ink) text-sm no-underline transition hover:bg-(--accent-soft)'
                  params={{ albumSlug: image.album.slug }}
                  to='/albums/$albumSlug'
                >
                  {image.album.name}
                </Link>
              ) : null}
              {image.tags.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {image.tags.map((tag) => (
                    <Badge key={tag.id} variant='secondary'>
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {image.models.length > 0 ? (
                <div className='flex flex-col gap-2'>
                  <p className='m-0 text-(--sea-ink-soft) text-xs font-semibold uppercase'>
                    出镜
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {image.models.map((model) => (
                      <Badge key={model.id} variant='outline'>
                        {model.alias
                          ? `${model.name} / ${model.alias}`
                          : model.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              <a
                className='mt-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-(--sea-ink) px-3 font-semibold text-sm text-white no-underline transition hover:bg-(--accent-strong)'
                href={image.originalUrl}
                rel='noreferrer'
                target='_blank'
              >
                查看原图
                <ExternalLink aria-hidden='true' />
              </a>
            </aside>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function GallerySkeleton({ count = 12 }: { count?: number }) {
  const skeletons = Array.from({ length: count }, (_, itemIndex) => ({
    height: 220 + (itemIndex % 4) * 46,
    key: `gallery-skeleton-${count}-${itemIndex}`,
  }))

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {skeletons.map((item) => (
        <Skeleton
          className='rounded-md bg-(--surface-muted)'
          key={item.key}
          style={{ height: item.height }}
        />
      ))}
    </div>
  )
}

function formatDate(value: Date | number | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('zh-CN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
