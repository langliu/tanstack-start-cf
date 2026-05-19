import { createFileRoute } from '@tanstack/react-router'
import { AdminImageLibrary } from './-library-view'

export const Route = createFileRoute('/admin/trash')({
  component: TrashPage,
})

function TrashPage() {
  return <AdminImageLibrary activeFilter='trash' title='回收站' />
}
