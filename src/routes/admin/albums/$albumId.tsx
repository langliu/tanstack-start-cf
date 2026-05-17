import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, FolderOpen, Loader2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { orpc } from '#/orpc/client'

export const Route = createFileRoute('/admin/albums/$albumId')({
  component: AlbumDetailPage,
})

function AlbumDetailPage() {
  const { albumId } = Route.useParams()
  const navigate = useNavigate()

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
        id: string
        name: string
        sortOrder: number
      }
    | undefined
    | null

  const imagesData = imagesQuery.data as
    | {
        items?: Array<{
          filename: string
          height?: number | null
          id: string
          thumbnailUrl: string
          title: string
          width?: number | null
        }>
        total?: number
      }
    | undefined

  const images = imagesData?.items ?? []

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
      <div className='min-h-0 flex-1 overflow-y-auto p-4'>
        {imagesQuery.isLoading ? (
          <div className='grid place-items-center py-16'>
            <Loader2 className='size-7 animate-spin text-primary' />
          </div>
        ) : images.length === 0 ? (
          <div className='grid place-items-center py-16 text-muted-foreground text-sm'>
            暂无图片
          </div>
        ) : (
          <div className='grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3'>
            {images.map((img) => (
              <div
                className='group relative overflow-hidden rounded-md border bg-card'
                key={img.id}
              >
                {img.thumbnailUrl ? (
                  <img
                    alt={img.title}
                    className='aspect-[3/4] w-full object-cover'
                    src={img.thumbnailUrl}
                  />
                ) : (
                  <div className='flex aspect-[3/4] w-full items-center justify-center bg-background text-muted-foreground text-xs'>
                    无预览
                  </div>
                )}
                <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2'>
                  <p className='truncate text-xs'>{img.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
