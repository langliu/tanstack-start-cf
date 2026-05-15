import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { FolderOpen, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { orpc } from '#/orpc/client'
import { FieldInput, invalidateAdminQueries } from './route'

export const Route = createFileRoute('/admin/albums')({
  component: AlbumsPage,
})

function AlbumsPage() {
  const queryClient = useQueryClient()
  const [agencyId, setAgencyId] = useState('')
  const [name, setName] = useState('')

  const albumsQuery = useQuery(
    orpc.admin.albums.list.queryOptions({ input: {} }),
  )
  const agenciesQuery = useQuery(
    orpc.admin.agencies.list.queryOptions({ input: {} }),
  )

  const createMutation = useMutation({
    mutationFn: () =>
      orpc.admin.albums.create.call({
        agencyId: agencyId || null,
        name,
      }),
    onSuccess: () => {
      setAgencyId('')
      setName('')
      invalidateAdminQueries(queryClient)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => orpc.admin.albums.delete.call({ id }),
    onSuccess: () => invalidateAdminQueries(queryClient),
  })

  const albums = albumsQuery.data ?? []
  const agencies = agenciesQuery.data ?? []

  return (
    <section className='flex min-w-0 flex-col'>
      <div className='flex min-h-14 items-center gap-3 border-[#333331] border-b bg-[#1d1e22] px-4'>
        <FolderOpen className='size-5 text-[#73e0d3]' />
        <h1 className='font-semibold text-base'>专辑管理</h1>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto p-5'>
        <div className='mb-5 flex max-w-3xl flex-wrap items-center gap-2'>
          <FieldInput onChange={setName} placeholder='名称' value={name} />
          <select
            className='h-9 min-w-44 rounded-md border border-[#383a37] bg-[#17181b] px-3 text-sm outline-none focus:border-[#73e0d3]'
            onChange={(event) => setAgencyId(event.target.value)}
            value={agencyId}
          >
            <option value=''>无机构</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
          <button
            className='inline-flex h-9 items-center gap-2 rounded-md bg-[#73e0d3] px-3 font-semibold text-[#151615] text-sm hover:bg-[#8bece0] disabled:opacity-50'
            disabled={name.trim().length === 0}
            onClick={() => createMutation.mutate()}
            type='button'
          >
            <Plus className='size-4' />
            新增
          </button>
        </div>

        {albumsQuery.isLoading ? (
          <div className='grid place-items-center py-12'>
            <Loader2 className='size-6 animate-spin text-[#73e0d3]' />
          </div>
        ) : (
          <div className='grid max-w-4xl gap-2'>
            {albums.map((album) => (
              <div
                className='flex h-12 items-center gap-3 rounded-md border border-[#343631] bg-[#202125] px-3'
                key={album.id}
              >
                <span className='min-w-0 flex-1 truncate font-medium text-sm'>
                  {album.name}
                </span>
                <span className='text-[#9da19b] text-xs'>
                  {agencies.find((a) => a.id === album.agencyId)?.name ??
                    '无机构'}
                </span>
                <button
                  className='inline-flex size-8 items-center justify-center rounded-md text-[#ffb7aa] hover:bg-[#352322]'
                  onClick={() => deleteMutation.mutate(album.id)}
                  title='删除'
                  type='button'
                >
                  <Trash2 className='size-4' />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
