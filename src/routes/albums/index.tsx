import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  type SearchSchemaInput,
  useNavigate,
} from '@tanstack/react-router'
import { FolderOpen, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { orpc } from '#/orpc/client'

const PAGE_SIZE = 36
const ALL_VALUE = '__all__'

type AlbumsSearchInput = {
  agencyId?: string
  q?: string
}

type AlbumsSearch = {
  agencyId?: string
  q?: string
}

type PublicAlbum = {
  agency: null | {
    id: string
    name: string
  }
  coverImage: null | {
    dominantColors: null | string[]
    thumbnailUrl: string
    title: string
  }
  description: null | string
  id: string
  imageCount: number
  name: string
  slug: string
}

export const Route = createFileRoute('/albums/')({
  component: AlbumsPage,
  head: () => ({
    meta: [
      {
        title: '全部专辑',
      },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      orpc.gallery.facets.queryOptions({ input: {} }),
    )
  },
  validateSearch: (
    search: AlbumsSearchInput & SearchSchemaInput,
  ): AlbumsSearch => ({
    agencyId: cleanSearchValue(search.agencyId),
    q: cleanSearchValue(search.q),
  }),
})

function AlbumsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [query, setQuery] = useState(search.q ?? '')

  useEffect(() => {
    setQuery(search.q ?? '')
  }, [search.q])

  const facetsQuery = useQuery(orpc.gallery.facets.queryOptions({ input: {} }))
  const albumsQuery = useInfiniteQuery(
    orpc.gallery.albums.list.infiniteOptions({
      getNextPageParam: (lastPage) => {
        const nextOffset = lastPage.offset + lastPage.items.length
        return nextOffset < lastPage.total ? nextOffset : undefined
      },
      initialPageParam: 0,
      input: (pageParam: number) => ({
        agencyId: search.agencyId,
        limit: PAGE_SIZE,
        offset: pageParam,
        q: search.q,
      }),
    }),
  )
  const albums = useMemo(
    () =>
      (albumsQuery.data?.pages.flatMap((page) => page.items) ??
        []) as PublicAlbum[],
    [albumsQuery.data],
  )
  const total = albumsQuery.data?.pages[0]?.total ?? 0
  const agencies = facetsQuery.data?.agencies ?? []

  function updateSearch(next: Partial<AlbumsSearch>) {
    void navigate({
      search: {
        ...search,
        ...next,
      },
      to: '/albums',
    })
  }

  return (
    <main className='page-wrap px-4 pb-16 pt-10'>
      <section className='mb-8 flex flex-col gap-4'>
        <p className='island-kicker m-0'>Albums</p>
        <h1 className='display-title m-0 text-5xl font-bold leading-none text-(--sea-ink) sm:text-6xl'>
          全部专辑
        </h1>
        <p className='m-0 max-w-2xl text-(--sea-ink-soft) text-base leading-8'>
          以专辑为单位翻阅成组图片，保留每组内容自己的节奏。
        </p>
      </section>

      <section className='mb-8 rounded-md border border-(--line) bg-(--surface-strong) p-3'>
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]'>
          <form
            className='relative'
            onSubmit={(event) => {
              event.preventDefault()
              updateSearch({ q: query.trim() || undefined })
            }}
          >
            <Search className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--sea-ink-soft)' />
            <Input
              className='h-10 bg-(--surface-muted) pl-10'
              onChange={(event) => setQuery(event.target.value)}
              placeholder='搜索专辑或机构'
              type='search'
              value={query}
            />
          </form>
          <Select
            items={[
              { label: '全部机构', value: ALL_VALUE },
              ...agencies.map((agency) => ({
                label: agency.name,
                value: agency.id,
              })),
            ]}
            onValueChange={(value) =>
              updateSearch({
                agencyId: !value || value === ALL_VALUE ? undefined : value,
              })
            }
            value={search.agencyId ?? ALL_VALUE}
          >
            <SelectTrigger className='h-10 bg-(--surface-muted)'>
              <SelectValue placeholder='机构' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL_VALUE}>全部机构</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </section>

      {albumsQuery.isLoading ? (
        <AlbumGridSkeleton />
      ) : albums.length === 0 ? (
        <div className='grid min-h-80 place-items-center rounded-md border border-dashed border-(--line) bg-(--surface-muted) p-8 text-center'>
          <div className='flex max-w-sm flex-col items-center gap-3'>
            <span className='grid size-12 place-items-center rounded-md bg-(--accent-soft) text-(--accent-strong)'>
              <FolderOpen aria-hidden='true' />
            </span>
            <h2 className='m-0 font-semibold text-(--sea-ink) text-lg'>
              暂无专辑
            </h2>
            <p className='m-0 text-sm text-(--sea-ink-soft)'>
              当前筛选条件下没有专辑
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {albums.map((album) => (
              <AlbumCard album={album} key={album.id} />
            ))}
          </div>
          <div className='mt-8 flex justify-center'>
            {albumsQuery.hasNextPage ? (
              <Button
                disabled={albumsQuery.isFetchingNextPage}
                onClick={() => {
                  void albumsQuery.fetchNextPage()
                }}
                type='button'
                variant='outline'
              >
                {albumsQuery.isFetchingNextPage ? '加载中' : '加载更多'}
              </Button>
            ) : (
              <p className='m-0 text-sm text-(--sea-ink-soft)'>
                已展示全部 {total} 个专辑
              </p>
            )}
          </div>
        </>
      )}
    </main>
  )
}

function AlbumCard({ album }: { album: PublicAlbum }) {
  const color = album.coverImage?.dominantColors?.[0] ?? 'var(--surface-muted)'

  return (
    <article className='group overflow-hidden rounded-md border border-(--line) bg-(--surface-strong) shadow-[0_16px_38px_rgba(27,34,46,0.08)]'>
      <Link
        className='block no-underline'
        params={{ albumSlug: album.slug }}
        to='/albums/$albumSlug'
      >
        <span
          className='relative block aspect-4/3 overflow-hidden'
          style={{ background: color }}
        >
          {album.coverImage ? (
            <img
              alt={album.coverImage.title}
              className='h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]'
              loading='lazy'
              src={album.coverImage.thumbnailUrl}
            />
          ) : (
            <span className='grid h-full place-items-center text-(--sea-ink-soft)'>
              <FolderOpen aria-hidden='true' />
            </span>
          )}
          <span className='absolute left-3 bottom-3 rounded-md bg-black/60 px-2 py-1 font-semibold text-white text-xs'>
            {album.imageCount.toLocaleString('zh-CN')} 张
          </span>
        </span>
        <span className='flex flex-col gap-2 p-4'>
          <span className='flex items-start justify-between gap-3'>
            <span className='line-clamp-2 font-semibold text-(--sea-ink) text-lg leading-6'>
              {album.name}
            </span>
          </span>
          {album.agency ? (
            <Badge className='w-fit' variant='secondary'>
              {album.agency.name}
            </Badge>
          ) : null}
          {album.description ? (
            <span className='line-clamp-2 text-(--sea-ink-soft) text-sm leading-6'>
              {album.description}
            </span>
          ) : null}
        </span>
      </Link>
    </article>
  )
}

function AlbumGridSkeleton() {
  const skeletons = Array.from({ length: 9 }, (_, itemIndex) => ({
    key: `album-grid-skeleton-${itemIndex}`,
  }))

  return (
    <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
      {skeletons.map((item) => (
        <Skeleton
          className='h-72 rounded-md bg-(--surface-muted)'
          key={item.key}
        />
      ))}
    </div>
  )
}

function cleanSearchValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed || undefined
}
