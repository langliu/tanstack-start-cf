import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Building2, Tags, UserRound } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { orpc } from '#/orpc/client'

export const Route = createFileRoute('/explore')({
  component: ExplorePage,
  head: () => ({
    meta: [
      {
        title: '发现',
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
})

function ExplorePage() {
  const facetsQuery = useQuery(orpc.gallery.facets.queryOptions({ input: {} }))
  const statsQuery = useQuery(orpc.gallery.stats.queryOptions({ input: {} }))
  const tags = facetsQuery.data?.tags ?? []
  const models = facetsQuery.data?.models ?? []
  const agencies = facetsQuery.data?.agencies ?? []
  const skeletons = [
    'explore-tags-skeleton',
    'explore-models-skeleton',
    'explore-agencies-skeleton',
  ]

  return (
    <main className='page-wrap px-4 pb-16 pt-10'>
      <section className='mb-10 flex flex-col gap-4'>
        <p className='island-kicker m-0'>Explore</p>
        <h1 className='display-title m-0 text-5xl font-bold leading-none text-[var(--sea-ink)] sm:text-6xl'>
          发现
        </h1>
        <p className='m-0 max-w-2xl text-[var(--sea-ink-soft)] text-base leading-8'>
          标签、人物和机构把图库里的图片与专辑连接起来。
        </p>
      </section>

      <section className='mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4'>
        <Metric label='图片' value={statsQuery.data?.images ?? 0} />
        <Metric label='专辑' value={statsQuery.data?.albums ?? 0} />
        <Metric label='标签' value={statsQuery.data?.tags ?? 0} />
        <Metric label='机构' value={statsQuery.data?.agencies ?? 0} />
      </section>

      {facetsQuery.isLoading ? (
        <div className='grid gap-5 lg:grid-cols-3'>
          {skeletons.map((key) => (
            <Skeleton
              className='h-80 rounded-md bg-[var(--surface-muted)]'
              key={key}
            />
          ))}
        </div>
      ) : (
        <div className='grid gap-5 lg:grid-cols-3'>
          <FacetPanel icon={<Tags />} title='标签'>
            {tags.map((tag) => (
              <Link
                className='facet-link'
                key={tag.id}
                search={{
                  seed: `tag-${tag.id}`,
                  sort: 'random',
                  tagId: tag.id,
                }}
                to='/images'
              >
                <span className='min-w-0 truncate'>{tag.name}</span>
                <Badge variant='secondary'>
                  {tag.imageCount.toLocaleString('zh-CN')}
                </Badge>
              </Link>
            ))}
          </FacetPanel>
          <FacetPanel icon={<UserRound />} title='人物'>
            {models.map((model) => (
              <Link
                className='facet-link'
                key={model.id}
                search={{
                  modelId: model.id,
                  seed: `model-${model.id}`,
                  sort: 'random',
                }}
                to='/images'
              >
                <span className='min-w-0 truncate'>
                  {model.alias ? `${model.name} / ${model.alias}` : model.name}
                </span>
                <Badge variant='secondary'>
                  {model.imageCount.toLocaleString('zh-CN')}
                </Badge>
              </Link>
            ))}
          </FacetPanel>
          <FacetPanel icon={<Building2 />} title='机构'>
            {agencies.map((agency) => (
              <Link
                className='facet-link'
                key={agency.id}
                search={{ agencyId: agency.id }}
                to='/albums'
              >
                <span className='min-w-0 truncate'>{agency.name}</span>
                <Badge variant='secondary'>
                  {agency.albumCount.toLocaleString('zh-CN')}
                </Badge>
              </Link>
            ))}
          </FacetPanel>
        </div>
      )}
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className='rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-5'>
      <p className='m-0 text-[var(--sea-ink)] text-3xl font-bold'>
        {value.toLocaleString('zh-CN')}
      </p>
      <p className='m-0 mt-1 text-[var(--sea-ink-soft)] text-sm'>{label}</p>
    </article>
  )
}

function FacetPanel({
  children,
  icon,
  title,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  title: string
}) {
  return (
    <section className='rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-4'>
      <div className='mb-4 flex items-center gap-2 text-[var(--sea-ink)]'>
        {icon}
        <h2 className='m-0 font-semibold text-lg'>{title}</h2>
      </div>
      <div className='flex max-h-[34rem] flex-col gap-2 overflow-y-auto pr-1'>
        {children}
      </div>
    </section>
  )
}
