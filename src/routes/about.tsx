import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
  head: () => ({
    meta: [
      {
        title: '关于 Kite Gallery',
      },
    ],
  }),
})

function About() {
  return (
    <main className='page-wrap px-4 pb-16 pt-10'>
      <section className='grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start'>
        <div className='flex flex-col gap-4'>
          <p className='island-kicker m-0'>About</p>
          <h1 className='display-title m-0 text-5xl font-bold leading-none text-[var(--sea-ink)] sm:text-6xl'>
            关于这个图库
          </h1>
        </div>
        <div className='rounded-md border border-[var(--line)] bg-[var(--surface-strong)] p-6 text-[var(--sea-ink-soft)] leading-8'>
          <p className='m-0'>
            Kite Gallery
            是基于后台资产库生成的公开前台。后台负责图片上传、专辑整理、标签、人物和机构管理；前台则把这些内容组织成首页、随机流、专辑、专辑详情和发现页。
          </p>
          <p className='m-0 mt-5'>
            图片资源来自对象存储，前台通过公开查询接口读取必要字段，并只展示未删除的内容。
          </p>
        </div>
      </section>
    </main>
  )
}
