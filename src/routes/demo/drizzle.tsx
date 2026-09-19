import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc } from 'drizzle-orm'
import { db } from '#/db/index'
import { todos } from '#/db/schema'

const getTodos = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await db.query.todos.findMany({
    orderBy: [desc(todos.createdAt)],
  })
})

const createTodo = createServerFn({
  method: 'POST',
})
  .validator((data: { title: string }) => data)
  .handler(async ({ data }) => {
    await db.insert(todos).values({ title: data.title })
    return { success: true }
  })

export const Route = createFileRoute('/demo/drizzle')({
  component: DemoDrizzle,
  loader: async () => await getTodos(),
})

function DemoDrizzle() {
  const router = useRouter()
  const state = Route.useLoaderData()

  return (
    <div className='p-4 space-y-4'>
      <h1 className='text-2xl font-bold'>Todo List (Drizzle)</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const form = e.target as HTMLFormElement
          const input = form.elements.namedItem('title') as HTMLInputElement
          if (input.value) {
            await createTodo({ data: { title: input.value } })
            input.value = ''
            router.invalidate()
          }
        }}
      >
        <input
          className='border p-2 mr-2'
          name='title'
          placeholder='New Todo'
          type='text'
        />
        <button className='bg-blue-500 text-white p-2 rounded' type='submit'>
          Add
        </button>
      </form>
      <ul className='list-disc pl-5'>
        {state.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  )
}
