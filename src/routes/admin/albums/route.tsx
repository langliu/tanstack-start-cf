import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/albums')({
  component: AlbumsLayout,
})

function AlbumsLayout() {
  return <Outlet />
}
