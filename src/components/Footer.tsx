import { Link } from '@tanstack/react-router'

const footerLinks = [
  { label: '随机浏览', to: '/images' },
  { label: '专辑', to: '/albums' },
  { label: '发现', to: '/explore' },
  { label: '关于', to: '/about' },
] as const

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className='site-footer px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]'>
      <div className='page-wrap flex flex-col justify-between gap-6 sm:flex-row sm:items-center'>
        <div>
          <p className='m-0 font-semibold text-[var(--sea-ink)]'>
            Kite Gallery
          </p>
          <p className='m-0 mt-1 text-sm'>&copy; {year} Kite Gallery.</p>
        </div>
        <nav className='flex flex-wrap gap-4 text-sm font-semibold'>
          {footerLinks.map((item) => (
            <Link className='nav-link' key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
