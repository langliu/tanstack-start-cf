import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { getAdminSession } from './auth'

export const getCurrentAdminSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      return await getAdminSession(getRequestHeaders())
    } catch {
      return null
    }
  },
)
