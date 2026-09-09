'use client'

// SummaryCards — shows a count badge for each unique label found in the image.
//
// Example output:  🚗 car × 4   🚦 traffic light × 2   🚌 bus × 1
//
// Only detections that pass the current confidence threshold are counted.
// The badges update instantly when the slider moves (no re-inference).

import { colorForLabel } from '@/lib/colors'
import type { Detection } from '@/lib/types'

// A small emoji map so the cards feel more visual / alive
const LABEL_EMOJI: Record<string, string> = {
  car: '🚗',
  truck: '🚚',
  bus: '🚌',
  'traffic light': '🚦',
  person: '🚶',
  bicycle: '🚲',
  motorcycle: '🏍️',
  dog: '🐕',
  cat: '🐈',
  boat: '⛵',
  airplane: '✈️',
  chair: '🪑',
  // Anything not listed falls back to a generic dot
}

interface SummaryCardsProps {
  detections: Detection[]  // all detections (unfiltered)
  threshold: number        // current confidence threshold, 0–1
}

export function SummaryCards({ detections, threshold }: SummaryCardsProps) {
  // Step 1: Filter by threshold
  const visible = detections.filter(d => d.score >= threshold)

  if (visible.length === 0) return null

  // Step 2: Group by label and count
  // reduce() builds a map like { car: 4, 'traffic light': 2, bus: 1 }
  const counts = visible.reduce<Record<string, number>>((acc, d) => {
    acc[d.label] = (acc[d.label] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Detected Objects</p>

      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([label, count]) => {
          const color = colorForLabel(label)
          const emoji = LABEL_EMOJI[label] ?? '•'

          return (
            <div
              key={label}
              // Inline border color so each badge matches its bounding box
              style={{ borderColor: color, color }}
              className="flex items-center gap-1.5 rounded-full border-2 bg-background px-3 py-1 text-sm font-semibold"
            >
              <span>{emoji}</span>
              <span className="capitalize">{label}</span>
              <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-bold text-foreground">
                ×{count}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {visible.length} detection{visible.length !== 1 ? 's' : ''} above threshold
      </p>
    </div>
  )
}
