import type { RankingInfo } from '@tanstack/match-sorter-utils'
import { compareItems, rankItem } from '@tanstack/match-sorter-utils'
import { createFileRoute } from '@tanstack/react-router'
import type {
  Column,
  ColumnFiltersState,
  FilterFn,
  SortFn,
  TableFeatures,
} from '@tanstack/react-table'
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  filterFn_includesString,
  filterFn_includesStringSensitive,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import React from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { Person } from '#/data/demo-table-data'
import { makeData } from '#/data/demo-table-data'

export const Route = createFileRoute('/demo/table')({
  component: TableDemo,
})

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50]
const PAGE_SIZE_ITEMS = PAGE_SIZE_OPTIONS.map((pageSize) => ({
  label: `Show ${pageSize}`,
  value: String(pageSize),
}))

declare module '@tanstack/react-table' {
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

// Define a custom fuzzy filter function that will apply ranking info to rows (using match-sorter utils)
const fuzzyFilter: FilterFn<TableFeatures, Person> = (
  row,
  columnId,
  value,
  addMeta,
) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value)

  // Store the itemRank info
  addMeta?.({
    itemRank,
  })

  // Return if the item should be filtered in/out
  return itemRank.passed
}

// Define a custom fuzzy sort function that will sort by rank if the row has ranking information
const fuzzySort: SortFn<TableFeatures, Person> = (rowA, rowB, columnId) => {
  let dir = 0

  // Only sort by rank if the column has ranking information
  const rowARank = (
    rowA.columnFiltersMeta[columnId] as { itemRank?: RankingInfo } | undefined
  )?.itemRank
  const rowBRank = (
    rowB.columnFiltersMeta[columnId] as { itemRank?: RankingInfo } | undefined
  )?.itemRank
  if (rowARank && rowBRank) {
    dir = compareItems(rowARank, rowBRank)
  }

  // Provide an alphanumeric fallback for when the item ranks are equal
  return dir === 0 ? sortFn_alphanumeric(rowA, rowB, columnId) : dir
}

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: {
    equalsString: filterFn_equalsString,
    fuzzy: fuzzyFilter,
    includesString: filterFn_includesString,
    includesStringSensitive: filterFn_includesStringSensitive,
  },
  filterMeta: {} as { itemRank: RankingInfo },
  globalFilteringFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    fuzzy: fuzzySort,
  },
})

const columnHelper = createColumnHelper<typeof features, Person>()

const columns = columnHelper.columns([
  columnHelper.accessor('id', {
    filterFn: 'equalsString', // note: normal non-fuzzy filter column - exact match required
  }),
  columnHelper.accessor('firstName', {
    cell: (info) => info.getValue(),
    filterFn: 'includesStringSensitive', // note: normal non-fuzzy filter column - case sensitive
  }),
  columnHelper.accessor((row) => row.lastName, {
    cell: (info) => info.getValue(),
    filterFn: 'includesString', // note: normal non-fuzzy filter column - case insensitive
    header: () => <span>Last Name</span>,
    id: 'lastName',
  }),
  columnHelper.accessor((row) => `${row.firstName} ${row.lastName}`, {
    cell: (info) => info.getValue(),
    filterFn: 'fuzzy', // using our custom fuzzy filter function
    header: 'Full Name',
    id: 'fullName',
    sortFn: 'fuzzy', // sort by fuzzy rank (falls back to alphanumeric)
  }),
])

function TableDemo() {
  const rerender = React.useReducer(() => ({}), {})[1]

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [globalFilter, setGlobalFilter] = React.useState('')

  const [data, setData] = React.useState<Person[]>(() => makeData(5_000))
  const refreshData = () => setData((_old) => makeData(50_000)) // stress test

  const table = useTable({
    columns,
    data,
    features,
    globalFilterFn: 'fuzzy', // apply fuzzy filter to the global filter (most common use case for fuzzy filter)
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      columnFilters,
      globalFilter,
    },
  })

  const filteredColumnId = table.state.columnFilters[0]?.id
  const sortedColumnId = table.state.sorting[0]?.id

  // apply the fuzzy sort if the fullName column is being filtered
  React.useEffect(() => {
    if (filteredColumnId === 'fullName') {
      if (sortedColumnId !== 'fullName') {
        table.setSorting([{ desc: false, id: 'fullName' }])
      }
    }
  }, [filteredColumnId, sortedColumnId, table])

  return (
    <div className='min-h-screen bg-gray-900 p-6'>
      <div>
        <DebouncedInput
          className='w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
          onChange={(value) => setGlobalFilter(String(value))}
          placeholder='Search all columns...'
          value={globalFilter ?? ''}
        />
      </div>
      <div className='h-4' />
      <div className='overflow-x-auto rounded-lg border border-gray-700'>
        <table className='w-full text-sm text-gray-200'>
          <thead className='bg-gray-800 text-gray-100'>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      className='px-4 py-3 text-left'
                      colSpan={header.colSpan}
                      key={header.id}
                    >
                      {header.isPlaceholder ? null : (
                        <>
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? 'cursor-pointer select-none hover:text-blue-400 transition-colors'
                                : '',
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            <table.FlexRender header={header} />
                            {{
                              asc: ' 🔼',
                              desc: ' 🔽',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                          {header.column.getCanFilter() ? (
                            <div className='mt-2'>
                              <Filter column={header.column} />
                            </div>
                          ) : null}
                        </>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className='divide-y divide-gray-700'>
            {table.getRowModel().rows.map((row) => {
              return (
                <tr
                  className='hover:bg-gray-800 transition-colors'
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <td className='px-4 py-3' key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className='h-4' />
      <div className='flex flex-wrap items-center gap-2 text-gray-200'>
        <button
          className='px-3 py-1 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.firstPage()}
          type='button'
        >
          {'<<'}
        </button>
        <button
          className='px-3 py-1 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
          type='button'
        >
          {'<'}
        </button>
        <button
          className='px-3 py-1 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
          type='button'
        >
          {'>'}
        </button>
        <button
          className='px-3 py-1 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
          disabled={!table.getCanNextPage()}
          onClick={() => table.lastPage()}
          type='button'
        >
          {'>>'}
        </button>
        <span className='flex items-center gap-1'>
          <div>Page</div>
          <strong>
            {table.state.pagination.pageIndex + 1} of {table.getPageCount()}
          </strong>
        </span>
        <span className='flex items-center gap-1'>
          | Go to page:
          <input
            className='w-16 px-2 py-1 bg-gray-800 rounded-md border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
            defaultValue={table.state.pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              table.setPageIndex(page)
            }}
            type='number'
          />
        </span>
        <Select
          items={PAGE_SIZE_ITEMS}
          onValueChange={(value) => {
            table.setPageSize(Number(value))
          }}
          value={String(table.state.pagination.pageSize)}
        >
          <SelectTrigger className='h-8 w-28 border-gray-700 bg-gray-800 text-white focus-visible:ring-blue-500'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className='border-gray-700 bg-gray-800 text-white'>
            <SelectGroup>
              {PAGE_SIZE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className='mt-4 text-gray-400'>
        {table.getPrePaginatedRowModel().rows.length} Rows
      </div>
      <div className='mt-4 flex gap-2'>
        <button
          className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
          onClick={() => rerender()}
          type='button'
        >
          Force Rerender
        </button>
        <button
          className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors'
          onClick={() => refreshData()}
          type='button'
        >
          Refresh Data
        </button>
      </div>
      <pre className='mt-4 p-4 bg-gray-800 rounded-lg text-gray-300 overflow-auto'>
        {JSON.stringify(
          {
            columnFilters: table.state.columnFilters,
            globalFilter: table.state.globalFilter,
          },
          null,
          2,
        )}
      </pre>
    </div>
  )
}

function Filter({ column }: { column: Column<typeof features, Person> }) {
  const columnFilterValue = column.getFilterValue()

  return (
    <DebouncedInput
      className='w-full px-2 py-1 bg-gray-700 text-white rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none'
      onChange={(value) => column.setFilterValue(value)}
      placeholder='Search...'
      type='text'
      value={(columnFilterValue ?? '') as string}
    />
  )
}

// A typical debounced input react component
function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [value, setValue] = React.useState(initialValue)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value, onChange, debounce])

  return (
    <input
      {...props}
      onChange={(e) => setValue(e.target.value)}
      value={value}
    />
  )
}
