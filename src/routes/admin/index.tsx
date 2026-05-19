import { createFileRoute } from '@tanstack/react-router'
import {
  AdminImageLibrary,
  FILTER_VALUES,
  type LibraryFilter,
} from './-library-view'

export const Route = createFileRoute('/admin/')({
  component: LibraryPage,
  validateSearch: (
    search: Record<string, string | undefined>,
  ): { filter: LibraryFilter } => ({
    filter: FILTER_VALUES.includes(search.filter as LibraryFilter)
      ? (search.filter as LibraryFilter)
      : 'all',
  }),
})

function LibraryPage() {
  const { filter } = Route.useSearch()
  return <AdminImageLibrary activeFilter={filter} />
}
