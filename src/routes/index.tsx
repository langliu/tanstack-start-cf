import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Images, Library, Shuffle } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { orpc } from '#/orpc/client'

type HomeImage = {
  dominantColors: null | string[]
  id: string
  thumbnailUrl: string
  title: string
}

type HomeAlbum = {
  coverImage: null | {
    dominantColors: null | string[]
    thumbnailUrl: string
    title: string
  }
  id: string
  imageCount: number
  name: string
  slug: string
}

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      {
        title: 'Kite Gallery',
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(
        orpc.gallery.stats.queryOptions({ input: {} }),
      ),
      context.queryClient.prefetchQuery(
        orpc.gallery.images.list.queryOptions({
          input: { limit: 14, seed: 'home-collage', sort: 'random' },
        }),
      ),
      context.queryClient.prefetchQuery(
        orpc.gallery.albums.list.queryOptions({
          input: { limit: 6, offset: 0 },
        }),
      ),
    ])
  },
})

function HomePage() {
  const statsQuery = useQuery(orpc.gallery.stats.queryOptions({ input: {} }))
  const imagesQuery = useQuery(
    orpc.gallery.images.list.queryOptions({
      input: { limit: 14, seed: 'home-collage', sort: 'random' },
    }),
  )
  const albumsQuery = useQuery(
    orpc.gallery.albums.list.queryOptions({
      input: { limit: 6, offset: 0 },
    }),
  )
  const images = (imagesQuery.data?.items ?? []) as HomeImage[]
  const albums = (albumsQuery.data?.items ?? []) as HomeAlbum[]
  const albumSkeletons = Array.from({ length: 6 }, (_, itemIndex) => ({
    key: `home-album-skeleton-${itemIndex}`,
  }))

  return (
    <main>
      <section className='hero-collage relative isolate min-h-[72svh] overflow-hidden border-[var(--line)] border-b'>
        <ImageCollage images={images} />
        <div className='absolute inset-0 bg-[linear-gradient(90deg,rgba(247,244,238,0.96)_0%,rgba(247,244,238,0.78)_42%,rgba(247,244,238,0.2)_100%)] dark:bg-[linear-gradient(90deg,rgba(12,15,20,0.95)_0%,rgba(12,15,20,0.72)_45%,rgba(12,15,20,0.2)_100%)]' />
        <div className='page-wrap relative flex min-h-[72svh] items-end px-4 pb-14 pt-20'>
          <div className='max-w-3xl'>
            <p className='island-kicker m-0 mb-4'>Kite Gallery</p>
            <h1 className='display-title m-0 text-6xl font-bold leading-none text-[var(--sea-ink)] sm:text-7xl lg:text-8xl'>
              轻盈、安静的图片档案
            </h1>
            <p className='mt-6 max-w-2xl text-[var(--sea-ink-soft)] text-lg leading-8'>
              从后台整理出的图片、专辑、标签和人物，会在这里以更适合浏览的方式展开。
            </p>
            <div className='mt-8 flex flex-wrap gap-3'>
              <Button
                nativeButton={false}
                render={<Link to='/images' />}
                size='lg'
              >
                <Shuffle data-icon='inline-start' />
                随机浏览
              </Button>
              <Button
                nativeButton={false}
                render={<Link to='/albums' />}
                size='lg'
                variant='outline'
              >
                <Library data-icon='inline-start' />
                查看专辑
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className='page-wrap grid gap-5 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4'>
        <HomeStat label='图片' value={statsQuery.data?.images ?? 0} />
        <HomeStat label='专辑' value={statsQuery.data?.albums ?? 0} />
        <HomeStat label='标签' value={statsQuery.data?.tags ?? 0} />
        <HomeStat label='人物' value={statsQuery.data?.models ?? 0} />
      </section>

      <section className='page-wrap px-4 py-8'>
        <div className='mb-5 flex items-end justify-between gap-4'>
          <div>
            <p className='island-kicker m-0 mb-2'>Latest Albums</p>
            <h2 className='display-title m-0 text-4xl font-bold text-[var(--sea-ink)]'>
              专辑入口
            </h2>
          </div>
          <Button
            nativeButton={false}
            render={<Link to='/albums' />}
            variant='ghost'
          >
            全部专辑
          </Button>
        </div>
        {albumsQuery.isLoading ? (
          <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {albumSkeletons.map((item) => (
              <Skeleton
                className='h-64 rounded-md bg-[var(--surface-muted)]'
                key={item.key}
              />
            ))}
          </div>
        ) : (
          <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {albums.map((album) => (
              <Link
                className='group overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface-strong)] text-inherit no-underline shadow-[0_16px_38px_rgba(27,34,46,0.08)]'
                key={album.id}
                params={{ albumSlug: album.slug }}
                to='/albums/$albumSlug'
              >
                <span
                  className='block aspect-[4/3] overflow-hidden bg-[var(--surface-muted)]'
                  style={{
                    background:
                      album.coverImage?.dominantColors?.[0] ?? undefined,
                  }}
                >
                  {album.coverImage ? (
                    <img
                      alt={album.coverImage.title}
                      className='h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]'
                      loading='lazy'
                      src={album.coverImage.thumbnailUrl}
                    />
                  ) : (
                    <span className='grid h-full place-items-center text-[var(--sea-ink-soft)]'>
                      <Images aria-hidden='true' />
                    </span>
                  )}
                </span>
                <span className='flex flex-col gap-2 p-4'>
                  <span className='line-clamp-2 font-semibold text-[var(--sea-ink)] text-lg'>
                    {album.name}
                  </span>
                  <Badge className='w-fit' variant='secondary'>
                    {album.imageCount.toLocaleString('zh-CN')} 张
                  </Badge>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className='page-wrap px-4 pb-16 pt-8'>
        <div className='grid gap-5 lg:grid-cols-[1fr_1fr]'>
          <Link
            className='route-tile min-h-52 rounded-md border border-[var(--line)] bg-[var(--sea-ink)] p-6 text-white no-underline'
            to='/images'
          >
            <Shuffle aria-hidden='true' />
            <span className='display-title text-4xl font-bold'>随机流</span>
          </Link>
          <Link
            className='route-tile min-h-52 rounded-md border border-[var(--line)] bg-[var(--accent-strong)] p-6 text-white no-underline'
            to='/explore'
          >
            <Library aria-hidden='true' />
            <span className='display-title text-4xl font-bold'>发现</span>
          </Link>
        </div>
      </section>
    </main>
  )
}

function ImageCollage({ images }: { images: HomeImage[] }) {
  if (images.length === 0) {
    return (
      <div className='absolute inset-0 bg-[linear-gradient(135deg,var(--surface-muted),var(--accent-soft))]' />
    )
  }

  return (
    <div className='absolute inset-0 grid grid-cols-3 gap-2 p-2 opacity-90 sm:grid-cols-5 lg:grid-cols-7'>
      {images.map((image, index) => (
        <div
          className='overflow-hidden rounded-md bg-[var(--surface-muted)]'
          key={image.id}
          style={{
            background: image.dominantColors?.[0] ?? undefined,
            gridRow: index % 5 === 0 ? 'span 2' : undefined,
          }}
        >
          <img
            alt={image.title}
            className='h-full min-h-36 w-full object-cover'
            decoding='async'
            loading={index > 5 ? 'lazy' : 'eager'}
            src={image.thumbnailUrl}
          />
        </div>
      ))}
    </div>
  )
}

function HomeStat({ label, value }: { label: string; value: number }) {
  return (
    <article className='rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-5'>
      <p className='m-0 text-[var(--sea-ink)] text-3xl font-bold'>
        {value.toLocaleString('zh-CN')}
      </p>
      <p className='m-0 mt-1 text-[var(--sea-ink-soft)] text-sm'>{label}</p>
    </article>
  )
}
