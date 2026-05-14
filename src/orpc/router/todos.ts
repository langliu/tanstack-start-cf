import { os } from '@orpc/server'
import { desc } from 'drizzle-orm'
import * as z from 'zod'

import { db } from '#/db/index'
import { todos } from '#/db/schema'

const AddTodoInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
})

export const listTodos = os.input(z.object({})).handler(async () => {
  const rows = await db.query.todos.findMany({
    orderBy: [desc(todos.createdAt), desc(todos.id)],
  })

  return rows.map((todo) => ({
    id: todo.id,
    name: todo.title,
  }))
})

export const addTodo = os
  .input(AddTodoInputSchema)
  .handler(async ({ input }) => {
    const [newTodo] = await db
      .insert(todos)
      .values({ title: input.name })
      .returning({
        id: todos.id,
        name: todos.title,
      })

    if (!newTodo) {
      throw new Error('Failed to create todo')
    }

    return newTodo
  })
