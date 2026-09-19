import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowUpRight, Images, Library, Shuffle } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { orpc } from '#/orpc/client'

type HomeAlbum = {
  id: string
  imageCount: number
  name: string
  slug: string
}

type HomeStatItem = {
  label: string
  value: number
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
        orpc.gallery.albums.list.queryOptions({
          input: { limit: 6, offset: 0 },
        }),
      ),
    ])
  },
})

function HomePage() {
  const statsQuery = useQuery(orpc.gallery.stats.queryOptions({ input: {} }))
  const albumsQuery = useQuery(
    orpc.gallery.albums.list.queryOptions({
      input: { limit: 6, offset: 0 },
    }),
  )
  const albums = (albumsQuery.data?.items ?? []) as HomeAlbum[]
  const albumSkeletons = Array.from({ length: 6 }, (_, itemIndex) => ({
    key: `home-album-skeleton-${itemIndex}`,
  }))
  const statItems: HomeStatItem[] = [
    { label: '图片', value: statsQuery.data?.images ?? 0 },
    { label: '专辑', value: statsQuery.data?.albums ?? 0 },
    { label: '标签', value: statsQuery.data?.tags ?? 0 },
    { label: '人物', value: statsQuery.data?.models ?? 0 },
  ]
  const showAlbumEntry = albumsQuery.isPending || albums.length > 0

  return (
    <main>
      <section className='relative isolate min-h-[60svh] overflow-hidden border-(--line) border-b'>
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(168,79,63,0.12),transparent_30%),radial-gradient(circle_at_78%_14%,rgba(47,111,136,0.12),transparent_32%),linear-gradient(180deg,rgba(255,252,246,0.72),rgba(244,240,231,0.28))] dark:bg-[radial-gradient(circle_at_18%_24%,rgba(214,111,95,0.14),transparent_30%),radial-gradient(circle_at_78%_14%,rgba(107,185,176,0.12),transparent_32%),linear-gradient(180deg,rgba(18,20,24,0.5),rgba(16,18,23,0.2))]' />
        <div className='page-wrap relative grid min-h-[60svh] items-center gap-8 px-4 py-16 lg:grid-cols-[minmax(0,1fr)_360px]'>
          <div className='max-w-3xl'>
            <p className='island-kicker m-0 mb-4'>Kite Gallery</p>
            <h1 className='display-title m-0 max-w-4xl text-5xl font-bold leading-[0.95] text-(--sea-ink) sm:text-6xl lg:text-7xl'>
              轻盈安静的图片档案
            </h1>
            <p className='mt-6 max-w-2xl text-(--sea-ink-soft) text-lg leading-8'>
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
              {showAlbumEntry ? (
                <Button
                  nativeButton={false}
                  render={<Link to='/albums' />}
                  size='lg'
                  variant='outline'
                >
                  <Library data-icon='inline-start' />
                  查看专辑
                </Button>
              ) : null}
            </div>
          </div>
          <HomeDigest stats={statItems} />
        </div>
      </section>

      <section className='page-wrap grid gap-3 px-4 py-8 sm:grid-cols-2 lg:hidden'>
        {statItems.map((item) => (
          <HomeStat key={item.label} label={item.label} value={item.value} />
        ))}
      </section>

      <section className='page-wrap px-4 py-8'>
        <div className='mb-5 flex items-end justify-between gap-4'>
          <div>
            <p className='island-kicker m-0 mb-2'>
              {showAlbumEntry ? 'Latest Albums' : 'Library Entry'}
            </p>
            <h2 className='display-title m-0 text-4xl font-bold text-(--sea-ink)'>
              {showAlbumEntry ? '专辑入口' : '浏览入口'}
            </h2>
          </div>
          <Button
            nativeButton={false}
            render={<Link to={showAlbumEntry ? '/albums' : '/images'} />}
            variant='ghost'
          >
            {showAlbumEntry ? '全部专辑' : '全部图片'}
          </Button>
        </div>
        {albumsQuery.isPending ? (
          <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {albumSkeletons.map((item) => (
              <Skeleton
                className='h-40 rounded-md bg-(--surface-muted)'
                key={item.key}
              />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <EmptyHomePanel />
        ) : (
          <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {albums.map((album) => (
              <Link
                className='home-entry-card group flex min-h-40 flex-col justify-between rounded-md border border-(--line) bg-(--surface-strong) p-5 text-inherit no-underline'
                key={album.id}
                params={{ albumSlug: album.slug }}
                to='/albums/$albumSlug'
              >
                <span className='flex items-start justify-between gap-4'>
                  <span className='line-clamp-2 font-semibold text-(--sea-ink) text-xl'>
                    {album.name}
                  </span>
                  <ArrowUpRight
                    aria-hidden='true'
                    className='size-5 shrink-0 text-(--accent-strong) transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
                  />
                </span>
                <span className='mt-8 flex items-center justify-between gap-3'>
                  <Badge className='w-fit' variant='secondary'>
                    {album.imageCount.toLocaleString('zh-CN')} 张
                  </Badge>
                  <span className='text-(--sea-ink-soft) text-sm'>
                    查看专辑
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className='page-wrap px-4 pb-16 pt-8'>
        <div className='grid gap-5 lg:grid-cols-[1.15fr_0.85fr]'>
          <Link
            className='route-tile min-h-56 rounded-md border border-(--line) bg-(--sea-ink) p-6 text-white no-underline'
            to='/images'
          >
            <Shuffle aria-hidden='true' />
            <span className='flex items-end justify-between gap-4'>
              <span className='display-title text-4xl font-bold'>随机流</span>
              <ArrowUpRight aria-hidden='true' />
            </span>
          </Link>
          <Link
            className='route-tile min-h-56 rounded-md border border-(--line) bg-(--accent-strong) p-6 text-white no-underline'
            to='/explore'
          >
            <Library aria-hidden='true' />
            <span className='flex items-end justify-between gap-4'>
              <span className='display-title text-4xl font-bold'>发现</span>
              <ArrowUpRight aria-hidden='true' />
            </span>
          </Link>
        </div>
      </section>
    </main>
  )
}

function HomeDigest({ stats }: { stats: HomeStatItem[] }) {
  return (
    <aside className='hero-digest hidden rounded-md border border-(--line) bg-(--surface-strong) p-5 backdrop-blur-md lg:block'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='island-kicker m-0 mb-2'>Overview</p>
          <p className='m-0 max-w-56 text-(--sea-ink-soft) text-sm leading-6'>
            首页只保留图库概览和入口，具体图片浏览交给随机流与专辑页。
          </p>
        </div>
        <Images aria-hidden='true' className='size-7 text-(--accent-strong)' />
      </div>
      <div className='mt-6 grid grid-cols-2 gap-3 border-(--line) border-t pt-4'>
        {stats.map((item) => (
          <div
            className='rounded-md bg-(--surface-muted) px-3 py-3'
            key={item.label}
          >
            <p className='m-0 text-(--sea-ink) text-2xl font-bold leading-none'>
              {item.value.toLocaleString('zh-CN')}
            </p>
            <p className='m-0 mt-1 truncate text-(--sea-ink-soft) text-[0.68rem]'>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </aside>
  )
}

function EmptyHomePanel() {
  return (
    <div className='grid min-h-48 place-items-center rounded-md border border-dashed border-(--line) bg-(--surface-muted) p-8 text-center text-(--sea-ink-soft)'>
      <div className='max-w-md'>
        <Images aria-hidden='true' className='mx-auto mb-3 size-8' />
        <p className='m-0 font-semibold text-(--sea-ink)'>暂无专辑入口</p>
        <p className='m-0 mt-2 text-sm leading-6'>
          首页不展示图片预览，可从随机流进入完整图库。
        </p>
      </div>
    </div>
  )
}

function HomeStat({ label, value }: { label: string; value: number }) {
  return (
    <article className='home-stat rounded-md border border-(--line) bg-(--surface-strong) p-5'>
      <p className='m-0 text-(--sea-ink) text-3xl font-bold leading-none'>
        {value.toLocaleString('zh-CN')}
      </p>
      <p className='m-0 mt-1 text-(--sea-ink-soft) text-sm'>{label}</p>
    </article>
  )
}
