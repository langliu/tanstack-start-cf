import { useNavigate } from '@tanstack/react-router'
import { Images, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { authClient } from '#/lib/auth-client'

export function AdminLoginForm({ redirectTo = '/admin' }: { redirectTo?: string }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const result = isSignUp
      ? await authClient.signUp.email({ email, name, password })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (result.error) {
      setError(result.error.message ?? '登录失败')
      return
    }

    await navigate({ to: safeRedirectPath(redirectTo) })
  }

  return (
    <form
      className='w-full max-w-sm rounded-lg border bg-card p-5 text-card-foreground shadow-2xl'
      onSubmit={submit}
    >
      <div className='mb-5 flex items-center gap-3'>
        <div className='grid size-10 place-items-center rounded-md bg-primary text-primary-foreground'>
          <Images className='size-5' />
        </div>
        <div>
          <h1 className='font-semibold text-lg leading-none'>后台登录</h1>
          <p className='mt-1 text-muted-foreground text-xs'>
            {isSignUp ? '创建管理员账号' : '进入图片管理'}
          </p>
        </div>
      </div>

      <div className='grid gap-3'>
        {isSignUp && (
          <Input
            autoComplete='name'
            className='h-10 bg-background/60'
            onChange={(event) => setName(event.target.value)}
            placeholder='名称'
            required
            type='text'
            value={name}
          />
        )}
        <Input
          autoComplete='email'
          className='h-10 bg-background/60'
          onChange={(event) => setEmail(event.target.value)}
          placeholder='Email'
          required
          type='email'
          value={email}
        />
        <Input
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          className='h-10 bg-background/60'
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder='Password'
          required
          type='password'
          value={password}
        />
      </div>

      {error && (
        <p className='mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm'>
          {error}
        </p>
      )}

      <Button className='mt-4 h-10 w-full' disabled={loading} type='submit'>
        {loading ? <Loader2 className='size-4 animate-spin' /> : null}
        {isSignUp ? '创建账号' : '登录'}
      </Button>
      <Button
        className='mt-3 w-full'
        onClick={() => {
          setError('')
          setIsSignUp((value) => !value)
        }}
        type='button'
        variant='ghost'
      >
        {isSignUp ? '已有账号，去登录' : '没有账号，创建一个'}
      </Button>
    </form>
  )
}

function safeRedirectPath(value: string) {
  return value.startsWith('/admin') ? value : '/admin'
}
