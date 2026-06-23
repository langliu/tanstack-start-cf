import { Link } from '@tanstack/react-router'
import { Images, LockKeyhole } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { label: '首页', to: '/' },
  { label: '随机浏览', to: '/images' },
  { label: '专辑', to: '/albums' },
  { label: '发现', to: '/explore' },
  { label: '关于', to: '/about' },
] as const

export default function Header() {
  return (
    <header className='sticky top-0 z-50 border-[var(--line)] border-b bg-[var(--header-bg)] px-4 backdrop-blur-lg'>
      <nav className='page-wrap flex flex-wrap items-center gap-x-4 gap-y-3 py-3'>
        <Link
          className='brand-link flex-shrink-0 rounded-md border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-2 font-semibold text-[var(--sea-ink)] text-sm no-underline shadow-[0_8px_24px_rgba(27,34,46,0.08)]'
          to='/'
        >
          <Images aria-hidden='true' />
          Kite Gallery
        </Link>

        <div className='order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-2 pb-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-nowrap sm:pb-0'>
          {navItems.map((item) => (
            <Link
              activeProps={{ className: 'nav-link is-active' }}
              className='nav-link'
              key={item.to}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className='ml-auto flex items-center gap-2'>
          <Link
            className='admin-link hidden items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface-muted)] px-3 py-2 font-semibold text-[var(--sea-ink-soft)] text-sm no-underline transition hover:text-[var(--sea-ink)] sm:inline-flex'
            to='/admin'
          >
            <LockKeyhole aria-hidden='true' />
            后台
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
