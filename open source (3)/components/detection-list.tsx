'use client'

// DetectionList — a scrollable table of every detection above the threshold.
//
// Shows: label, confidence bar, and raw box coordinates.
// Kept simple and readable — no external table library needed at this scale.

import { colorForLabel } from '@/lib/colors'
import type { Detection } from '@/lib/types'

interface DetectionListProps {
  detections: Detection[]  // all detections (unfiltered)
  threshold: number        // current confidence threshold, 0–1
}

export function DetectionList({ detections, threshold }: DetectionListProps) {
  const visible = detections
    .filter(d => d.score >= threshold)
    // Sort highest confidence first so the most certain detections appear at the top
    .sort((a, b) => b.score - a.score)

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No detections above {Math.round(threshold * 100)}% threshold.
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_120px_180px] px-4 py-2 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Label</span>
        <span>Confidence</span>
        <span className="hidden sm:block">Coordinates</span>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-border/40 max-h-64 overflow-y-auto">
        {visible.map((d, i) => {
          const color = colorForLabel(d.label)
          const pct = Math.round(d.score * 100)

          return (
            <div
              key={`${d.label}-${i}`}
              className="grid grid-cols-[1fr_120px_180px] items-center px-4 py-2.5 hover:bg-muted/20 transition-colors"
            >
              {/* Label with color dot */}
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium capitalize">{d.label}</span>
              </div>

              {/* Confidence bar + percentage */}
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-xs font-mono tabular-nums text-muted-foreground w-8 text-right">
                  {pct}%
                </span>
              </div>

              {/* Bounding box coordinates (hidden on small screens) */}
              <span className="hidden sm:block text-xs font-mono text-muted-foreground truncate">
                ({Math.round(d.box.xmin * 100)},{Math.round(d.box.ymin * 100)})
                →
                ({Math.round(d.box.xmax * 100)},{Math.round(d.box.ymax * 100)})
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
