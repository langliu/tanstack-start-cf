import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  type SearchSchemaInput,
  useNavigate,
} from '@tanstack/react-router'
import { ArrowLeft, FolderOpen, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  GalleryMasonry,
  GallerySkeleton,
  type PublicGalleryImage,
} from '#/components/public/gallery-masonry'
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
import { orpc } from '#/orpc/client'

const PAGE_SIZE = 48
const ALL_VALUE = '__all__'
const SORT_VALUES = ['latest', 'random', 'top'] as const
type AlbumImageSort = (typeof SORT_VALUES)[number]

type AlbumSearchInput = {
  modelId?: string
  q?: string
  seed?: string
  sort?: string
  tagId?: string
}

type AlbumSearch = {
  modelId?: string
  q?: string
  seed: string
  sort: AlbumImageSort
  tagId?: string
}

export const Route = createFileRoute('/albums/$albumSlug')({
  component: AlbumDetailPage,
  head: ({ params }) => ({
    meta: [
      {
        title: `专辑 · ${params.albumSlug}`,
      },
    ],
  }),
  loader: async ({ context, params }) => {
    await context.queryClient.prefetchQuery(
      orpc.gallery.albums.detail.queryOptions({
        input: { slug: params.albumSlug },
      }),
    )
  },
  validateSearch: (
    search: AlbumSearchInput & SearchSchemaInput,
  ): AlbumSearch => ({
    modelId: cleanSearchValue(search.modelId),
    q: cleanSearchValue(search.q),
    seed: cleanSearchValue(search.seed) ?? 'album-gallery',
    sort: SORT_VALUES.includes(search.sort as AlbumImageSort)
      ? (search.sort as AlbumImageSort)
      : 'latest',
    tagId: cleanSearchValue(search.tagId),
  }),
})

function AlbumDetailPage() {
  const { albumSlug } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [query, setQuery] = useState(search.q ?? '')

  useEffect(() => {
    setQuery(search.q ?? '')
  }, [search.q])

  const albumQuery = useQuery(
    orpc.gallery.albums.detail.queryOptions({
      input: { slug: albumSlug },
    }),
  )
  const imagesQuery = useInfiniteQuery(
    orpc.gallery.images.list.infiniteOptions({
      enabled: Boolean(albumQuery.data),
      getNextPageParam: (lastPage) => {
        const nextOffset = lastPage.offset + lastPage.items.length
        return nextOffset < lastPage.total ? nextOffset : undefined
      },
      initialPageParam: 0,
      input: (pageParam: number) => ({
        albumSlug,
        limit: PAGE_SIZE,
        modelId: search.modelId,
        offset: pageParam,
        q: search.q,
        seed: search.seed,
        sort: search.sort,
        tagId: search.tagId,
      }),
    }),
  )
  const album = albumQuery.data
  const images = useMemo(
    () =>
      (imagesQuery.data?.pages.flatMap((page) => page.items) ??
        []) as PublicGalleryImage[],
    [imagesQuery.data],
  )
  const total = imagesQuery.data?.pages[0]?.total ?? 0

  function updateSearch(next: Partial<AlbumSearch>) {
    void navigate({
      params: { albumSlug },
      search: {
        ...search,
        ...next,
      },
      to: '/albums/$albumSlug',
    })
  }

  if (albumQuery.isLoading) {
    return (
      <main className='page-wrap px-4 pb-16 pt-10'>
        <GallerySkeleton count={8} />
      </main>
    )
  }

  if (!album) {
    return (
      <main className='page-wrap px-4 pb-16 pt-10'>
        <section className='grid min-h-96 place-items-center rounded-md border border-dashed border-(--line) bg-(--surface-muted) p-8 text-center'>
          <div className='flex max-w-sm flex-col items-center gap-4'>
            <span className='grid size-12 place-items-center rounded-md bg-(--accent-soft) text-(--accent-strong)'>
              <FolderOpen aria-hidden='true' />
            </span>
            <h1 className='m-0 font-semibold text-(--sea-ink) text-2xl'>
              专辑未找到
            </h1>
            <Button
              nativeButton={false}
              render={<Link to='/albums' />}
              variant='outline'
            >
              返回专辑
            </Button>
          </div>
        </section>
      </main>
    )
  }

  const tags = album.facets.tags
  const models = album.facets.models

  return (
    <main className='page-wrap px-4 pb-16 pt-8'>
      <div className='mb-6'>
        <Button
          nativeButton={false}
          render={<Link to='/albums' />}
          variant='ghost'
        >
          <ArrowLeft data-icon='inline-start' />
          全部专辑
        </Button>
      </div>

      <section className='mb-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-end'>
        <div className='overflow-hidden rounded-md border border-(--line) bg-(--surface-strong)'>
          <div
            className='aspect-4/3 bg-(--surface-muted)'
            style={{
              background: album.coverImage?.dominantColors?.[0] ?? undefined,
            }}
          >
            {album.coverImage ? (
              <img
                alt={album.coverImage.title}
                className='h-full w-full object-cover'
                src={album.coverImage.thumbnailUrl}
              />
            ) : (
              <span className='grid h-full place-items-center text-(--sea-ink-soft)'>
                <FolderOpen aria-hidden='true' />
              </span>
            )}
          </div>
        </div>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='secondary'>
              {album.imageCount.toLocaleString('zh-CN')} 张图片
            </Badge>
            {album.agency ? (
              <Badge variant='outline'>{album.agency.name}</Badge>
            ) : null}
          </div>
          <h1 className='display-title m-0 text-5xl font-bold leading-none text-(--sea-ink) sm:text-6xl'>
            {album.name}
          </h1>
          {album.description ? (
            <p className='m-0 max-w-2xl text-(--sea-ink-soft) text-base leading-8'>
              {album.description}
            </p>
          ) : null}
        </div>
      </section>

      <section className='mb-8 rounded-md border border-(--line) bg-(--surface-strong) p-3'>
        <div className='grid gap-3 lg:grid-cols-[minmax(240px,1fr)_170px_170px_170px_auto]'>
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
              placeholder='搜索专辑内图片'
              type='search'
              value={query}
            />
          </form>
          <Select
            items={[
              { label: '最新', value: 'latest' },
              { label: '随机', value: 'random' },
              { label: '评分', value: 'top' },
            ]}
            onValueChange={(value) => {
              if (value) {
                updateSearch({ sort: value as AlbumImageSort })
              }
            }}
            value={search.sort}
          >
            <SelectTrigger className='h-10 bg-(--surface-muted)'>
              <SelectValue placeholder='排序' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='latest'>最新</SelectItem>
                <SelectItem value='random'>随机</SelectItem>
                <SelectItem value='top'>评分</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={[
              { label: '全部标签', value: ALL_VALUE },
              ...tags.map((tag) => ({ label: tag.name, value: tag.id })),
            ]}
            onValueChange={(value) =>
              updateSearch({
                tagId: !value || value === ALL_VALUE ? undefined : value,
              })
            }
            value={search.tagId ?? ALL_VALUE}
          >
            <SelectTrigger className='h-10 bg-(--surface-muted)'>
              <SelectValue placeholder='标签' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL_VALUE}>全部标签</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={[
              { label: '全部人物', value: ALL_VALUE },
              ...models.map((model) => ({
                label: model.name,
                value: model.id,
              })),
            ]}
            onValueChange={(value) =>
              updateSearch({
                modelId: !value || value === ALL_VALUE ? undefined : value,
              })
            }
            value={search.modelId ?? ALL_VALUE}
          >
            <SelectTrigger className='h-10 bg-(--surface-muted)'>
              <SelectValue placeholder='人物' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL_VALUE}>全部人物</SelectItem>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            className='h-10'
            onClick={() =>
              updateSearch({
                seed: randomSeed(),
                sort: 'random',
              })
            }
            type='button'
            variant='outline'
          >
            随机排序
          </Button>
        </div>
      </section>

      {imagesQuery.isLoading ? (
        <GallerySkeleton />
      ) : (
        <GalleryMasonry
          emptyDescription='当前专辑没有匹配图片'
          emptyTitle='没有图片'
          hasMore={imagesQuery.hasNextPage}
          isLoadingMore={imagesQuery.isFetchingNextPage}
          items={images}
          onLoadMore={() => {
            void imagesQuery.fetchNextPage()
          }}
          showAlbumLink={false}
          total={total}
        />
      )}
    </main>
  )
}

function cleanSearchValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 12)
}
