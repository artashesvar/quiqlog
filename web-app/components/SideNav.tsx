'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/home',
    label: 'Home',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
]

const SIDEBAR_ROUTES = ['/home', '/dashboard']

export default function SideNav() {
  const pathname = usePathname()

  if (!SIDEBAR_ROUTES.includes(pathname)) return null

  return (
    <aside className="w-48 shrink-0 border-r border-border py-6 px-3 flex flex-col gap-1 sticky top-14 h-[calc(100vh-3.5rem)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent/15 text-text-primary border-l-2 border-accent pl-[10px]'
                : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary border-l-2 border-transparent pl-[10px]'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </aside>
  )
}
