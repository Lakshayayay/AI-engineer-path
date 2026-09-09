'use client'

// ModelStatusBar — shows what the detector is currently doing.
//
// This component lives at the top of the workspace and provides the user
// with clear, human-readable feedback at every stage:
//   idle          → "Ready. Upload an image or use the demo."
//   loading-model → "Downloading model… 42%" (with progress bar)
//   ready         → "Model ready."
//   detecting     → "Detecting objects…" (pulsing indicator)
//   done          → "Done! X objects detected."
//   error         → "Something went wrong."

import { cn } from '@/lib/utils'
import type { DetectorStatus } from '@/lib/types'

interface ModelStatusBarProps {
  status: DetectorStatus
  progress: number      // 0–100
  detectionCount: number
}

// Human-readable messages for each status
function statusMessage(
  status: DetectorStatus,
  progress: number,
  count: number,
): string {
  switch (status) {
    case 'idle':
      return 'Upload an image or try the demo below'
    case 'loading-model':
      return `Downloading AI model… ${progress}%`
    case 'ready':
      return 'Model ready — upload an image to detect objects'
    case 'detecting':
      return 'Detecting objects…'
    case 'done':
      return `Done! ${count} object${count !== 1 ? 's' : ''} detected`
    case 'error':
      return 'Something went wrong. Please try again.'
    default:
      return ''
  }
}

export function ModelStatusBar({ status, progress, detectionCount }: ModelStatusBarProps) {
  const message = statusMessage(status, progress, detectionCount)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {/* Animated indicator dot */}
        <span
          className={cn(
            'h-2 w-2 rounded-full flex-shrink-0',
            status === 'idle' && 'bg-muted-foreground/40',
            status === 'loading-model' && 'bg-amber-500 animate-pulse',
            status === 'ready' && 'bg-emerald-500',
            status === 'detecting' && 'bg-blue-500 animate-ping',
            status === 'done' && 'bg-emerald-500',
            status === 'error' && 'bg-red-500',
          )}
        />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {/* Download progress bar — only visible while the model is downloading */}
      {status === 'loading-model' && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
