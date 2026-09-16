import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Search, Shuffle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  GalleryMasonry,
  GallerySkeleton,
  type PublicGalleryImage,
} from '#/components/public/gallery-masonry'
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
const SORT_VALUES = ['random', 'latest', 'top'] as const
type ImageSort = (typeof SORT_VALUES)[number]

type ImagesSearch = {
  modelId?: string
  q?: string
  seed: string
  sort: ImageSort
  tagId?: string
}

export const Route = createFileRoute('/images')({
  component: ImagesPage,
  head: () => ({
    meta: [
      {
        title: '随机浏览图片',
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(
        orpc.gallery.facets.queryOptions({ input: {} }),
      ),
      context.queryClient.prefetchQuery(
        orpc.gallery.stats.queryOptions({ input: {} }),
      ),
    ])
  },
  validateSearch: (
    search: Record<string, string | undefined>,
  ): ImagesSearch => ({
    modelId: cleanSearchValue(search.modelId),
    q: cleanSearchValue(search.q),
    seed: cleanSearchValue(search.seed) ?? 'daily-gallery',
    sort: SORT_VALUES.includes(search.sort as ImageSort)
      ? (search.sort as ImageSort)
      : 'random',
    tagId: cleanSearchValue(search.tagId),
  }),
})

function ImagesPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [query, setQuery] = useState(search.q ?? '')

  useEffect(() => {
    setQuery(search.q ?? '')
  }, [search.q])

  const facetsQuery = useQuery(orpc.gallery.facets.queryOptions({ input: {} }))
  const statsQuery = useQuery(orpc.gallery.stats.queryOptions({ input: {} }))
  const imagesQuery = useInfiniteQuery({
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length
      return nextOffset < lastPage.total ? nextOffset : undefined
    },
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      orpc.gallery.images.list.call({
        limit: PAGE_SIZE,
        modelId: search.modelId,
        offset: pageParam,
        q: search.q,
        seed: search.seed,
        sort: search.sort,
        tagId: search.tagId,
      }),
    queryKey: ['gallery', 'images', search],
  })

  const images = useMemo(
    () =>
      (imagesQuery.data?.pages.flatMap((page) => page.items) ??
        []) as PublicGalleryImage[],
    [imagesQuery.data],
  )
  const total = imagesQuery.data?.pages[0]?.total ?? 0
  const tags = facetsQuery.data?.tags ?? []
  const models = facetsQuery.data?.models ?? []

  function updateSearch(next: Partial<ImagesSearch>) {
    void navigate({
      search: {
        ...search,
        ...next,
      },
      to: '/images',
    })
  }

  return (
    <main className='page-wrap px-4 pb-16 pt-10'>
      <section className='mb-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end'>
        <div className='flex flex-col gap-4'>
          <p className='island-kicker m-0'>Random Flow</p>
          <h1 className='display-title m-0 max-w-3xl text-5xl font-bold leading-none text-[var(--sea-ink)] sm:text-6xl'>
            随机浏览所有图片
          </h1>
          <p className='m-0 max-w-2xl text-[var(--sea-ink-soft)] text-base leading-8'>
            不同尺寸、颜色和主题在同一条瀑布流里交错出现。
          </p>
        </div>
        <div className='grid grid-cols-3 gap-3 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-4'>
          <Stat label='图片' value={statsQuery.data?.images ?? total} />
          <Stat label='标签' value={statsQuery.data?.tags ?? 0} />
          <Stat label='专辑' value={statsQuery.data?.albums ?? 0} />
        </div>
      </section>

      <section className='mb-8 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-4 shadow-[0_1px_0_var(--inset-glint)_inset,0_16px_36px_rgba(27,34,46,0.06)]'>
        <div className='grid items-center gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(20rem,1fr)_7.5rem_10rem_10rem_minmax(8.5rem,auto)]'>
          <form
            className='relative min-w-0 sm:col-span-2 lg:col-span-1'
            onSubmit={(event) => {
              event.preventDefault()
              updateSearch({ q: query.trim() || undefined })
            }}
          >
            <Search className='pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--sea-ink-soft)]' />
            <Input
              className='h-11 rounded-md bg-[var(--surface-muted)] pl-11'
              onChange={(event) => setQuery(event.target.value)}
              placeholder='搜索标题、专辑、机构'
              type='search'
              value={query}
            />
          </form>
          <Select
            items={[
              { label: '随机', value: 'random' },
              { label: '最新', value: 'latest' },
              { label: '评分', value: 'top' },
            ]}
            onValueChange={(value) => {
              if (value) {
                updateSearch({ sort: value as ImageSort })
              }
            }}
            value={search.sort}
          >
            <SelectTrigger className='!h-11 w-full rounded-md bg-[var(--surface-muted)]'>
              <SelectValue placeholder='排序' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='random'>随机</SelectItem>
                <SelectItem value='latest'>最新</SelectItem>
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
              updateSearch({ tagId: value === ALL_VALUE ? undefined : value })
            }
            value={search.tagId ?? ALL_VALUE}
          >
            <SelectTrigger className='!h-11 w-full rounded-md bg-[var(--surface-muted)]'>
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
              updateSearch({ modelId: value === ALL_VALUE ? undefined : value })
            }
            value={search.modelId ?? ALL_VALUE}
          >
            <SelectTrigger className='!h-11 w-full rounded-md bg-[var(--surface-muted)]'>
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
            className='h-11 w-full rounded-md'
            onClick={() =>
              updateSearch({
                seed: randomSeed(),
                sort: 'random',
              })
            }
            type='button'
          >
            <Shuffle data-icon='inline-start' />
            换一批
          </Button>
        </div>
      </section>

      {imagesQuery.isLoading ? (
        <GallerySkeleton />
      ) : (
        <GalleryMasonry
          emptyDescription='调整搜索或筛选后再试试'
          emptyTitle='没有匹配图片'
          hasMore={imagesQuery.hasNextPage}
          isLoadingMore={imagesQuery.isFetchingNextPage}
          items={images}
          onLoadMore={() => {
            void imagesQuery.fetchNextPage()
          }}
          total={total}
        />
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className='min-w-0'>
      <p className='m-0 text-[var(--sea-ink)] text-2xl font-bold'>
        {value.toLocaleString('zh-CN')}
      </p>
      <p className='m-0 text-[var(--sea-ink-soft)] text-xs'>{label}</p>
    </div>
  )
}

function cleanSearchValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 12)
}
