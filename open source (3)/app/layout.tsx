import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { AppSidebar } from '@/components/app-sidebar'

// Geist is a clean, modern, professional typeface designed by Vercel.
// It has excellent legibility at small sizes — important for the data-dense
// detection table and coordinate readouts.
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

export const metadata: Metadata = {
  title: 'DetectAI — In-Browser Object Detection',
  description:
    'Run state-of-the-art object detection entirely in your browser. ' +
    'No API key, no server, 100% private. Powered by Transformers.js.',
  icons: {
    icon: '/icon.svg',
  },
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="antialiased bg-background text-foreground">
        {/*
          Full-height flex layout:
            [Sidebar | Main content]
          The sidebar is sticky (stays in view when content scrolls).
          On mobile, the sidebar is hidden — only the main content is shown.
        */}
        <div className="flex min-h-screen">
          <AppSidebar />

          {/* Main content area — takes up all remaining horizontal space */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
