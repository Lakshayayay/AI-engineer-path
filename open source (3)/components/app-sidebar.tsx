'use client'

// AppSidebar — the main navigation sidebar.
//
// Uses Next.js <Link> for client-side navigation (no full page reloads).
// Stays collapsed on mobile (hidden), visible on desktop (fixed left panel).
// Highlights the active route with `usePathname()`.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ScanSearch, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  {
    href: '/',
    label: 'Detect',
    icon: ScanSearch,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    // Fixed sidebar — always visible on md+ screens, hidden on mobile
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border/60 bg-background h-screen sticky top-0">

      {/* Brand / Logo area */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/60">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
          {/* Using the Cpu icon to suggest AI / model running on device */}
          <Cpu className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight leading-none">DetectAI</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">In-browser inference</p>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        <p className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Workspace
        </p>

        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5',
                'text-sm transition-all duration-150',
                isActive
                  ? 'bg-foreground text-background font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className={cn(
                'h-4 w-4 flex-shrink-0',
                isActive ? 'text-background' : 'text-muted-foreground group-hover:text-foreground',
              )} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer — model info */}
      <div className="p-4 border-t border-border/60">
        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
          <p className="text-xs font-medium">Model</p>
          <p className="text-[10px] text-muted-foreground font-mono">Xenova/detr-resnet-50</p>
          <p className="text-[10px] text-muted-foreground">Runs in your browser · No API key needed</p>
        </div>
      </div>
    </aside>
  )
}
