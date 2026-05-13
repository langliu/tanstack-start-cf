import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/demo/better-auth')({
  component: BetterAuthDemo,
})

function BetterAuthDemo() {
  const { data: session, isPending } = authClient.useSession()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isPending) {
    return (
      <div className='flex items-center justify-center py-10'>
        <div className='h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900 dark:border-neutral-800 dark:border-t-neutral-100' />
      </div>
    )
  }

  if (session?.user) {
    return (
      <div className='flex justify-center py-10 px-4'>
        <div className='w-full max-w-md p-6 space-y-6'>
          <div className='space-y-1.5'>
            <h1 className='text-lg font-semibold leading-none tracking-tight'>
              Welcome back
            </h1>
            <p className='text-sm text-neutral-500 dark:text-neutral-400'>
              You're signed in as {session.user.email}
            </p>
          </div>

          <div className='flex items-center gap-3'>
            {session.user.image ? (
              <img alt='' className='h-10 w-10' src={session.user.image} />
            ) : (
              <div className='h-10 w-10 bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center'>
                <span className='text-sm font-medium text-neutral-600 dark:text-neutral-400'>
                  {session.user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium truncate'>
                {session.user.name}
              </p>
              <p className='text-xs text-neutral-500 dark:text-neutral-400 truncate'>
                {session.user.email}
              </p>
            </div>
          </div>

          <button
            className='w-full h-9 px-4 text-sm font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
            onClick={() => {
              void authClient.signOut()
            }}
          >
            Sign out
          </button>

          <p className='text-xs text-center text-neutral-400 dark:text-neutral-500'>
            Built with{' '}
            <a
              className='font-medium hover:text-neutral-600 dark:hover:text-neutral-300'
              href='https://better-auth.com'
              rel='noopener noreferrer'
              target='_blank'
            >
              BETTER-AUTH
            </a>
            .
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          email,
          name,
          password,
        })
        if (result.error) {
          setError(result.error.message || 'Sign up failed')
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        })
        if (result.error) {
          setError(result.error.message || 'Sign in failed')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex justify-center py-10 px-4'>
      <div className='w-full max-w-md p-6'>
        <h1 className='text-lg font-semibold leading-none tracking-tight'>
          {isSignUp ? 'Create an account' : 'Sign in'}
        </h1>
        <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-6'>
          {isSignUp
            ? 'Enter your information to create an account'
            : 'Enter your email below to login to your account'}
        </p>

        <form className='grid gap-4' onSubmit={handleSubmit}>
          {isSignUp && (
            <div className='grid gap-2'>
              <label
                className='text-sm font-medium leading-none'
                htmlFor='name'
              >
                Name
              </label>
              <input
                className='flex h-9 w-full border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 disabled:cursor-not-allowed disabled:opacity-50'
                id='name'
                onChange={(e) => setName(e.target.value)}
                required
                type='text'
                value={name}
              />
            </div>
          )}

          <div className='grid gap-2'>
            <label className='text-sm font-medium leading-none' htmlFor='email'>
              Email
            </label>
            <input
              className='flex h-9 w-full border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 disabled:cursor-not-allowed disabled:opacity-50'
              id='email'
              onChange={(e) => setEmail(e.target.value)}
              required
              type='email'
              value={email}
            />
          </div>

          <div className='grid gap-2'>
            <label
              className='text-sm font-medium leading-none'
              htmlFor='password'
            >
              Password
            </label>
            <input
              className='flex h-9 w-full border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 disabled:cursor-not-allowed disabled:opacity-50'
              id='password'
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              required
              type='password'
              value={password}
            />
          </div>

          {error && (
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3'>
              <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            </div>
          )}

          <button
            className='w-full h-9 px-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            disabled={loading}
            type='submit'
          >
            {loading ? (
              <span className='flex items-center justify-center gap-2'>
                <span className='h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white dark:border-neutral-600 dark:border-t-neutral-900' />
                <span>Please wait</span>
              </span>
            ) : isSignUp ? (
              'Create account'
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className='mt-4 text-center'>
          <button
            className='text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors'
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            type='button'
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>

        <p className='mt-6 text-xs text-center text-neutral-400 dark:text-neutral-500'>
          Built with{' '}
          <a
            className='font-medium hover:text-neutral-600 dark:hover:text-neutral-300'
            href='https://better-auth.com'
            rel='noopener noreferrer'
            target='_blank'
          >
            BETTER-AUTH
          </a>
          .
        </p>
      </div>
    </div>
  )
}
