'use client'

// DetectionCanvas — image display with bounding-box overlays.
//
// HOW boxes are positioned:
//   The model returns coordinates in 0–1 fractions (percentage mode).
//   We place the image inside a `position: relative` div, then use
//   `position: absolute` boxes whose top/left/width/height are expressed
//   as CSS percentages. This makes boxes resize correctly with the image
//   on any screen size — no pixel math needed.
//
// Confidence filtering happens HERE (client-side, no re-inference):
//   We filter detections by `score >= threshold` before rendering boxes.
//   Adjusting the slider is instant because we never re-run the model.

import Image from 'next/image'
import { colorForLabel } from '@/lib/colors'
import type { Detection } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DetectionCanvasProps {
  imageSrc: string           // URL (object URL or static path) of the image
  detections: Detection[]    // all detections from the model (unfiltered)
  threshold: number          // 0–1: only render boxes with score >= threshold
  isLoading?: boolean        // shows a pulse overlay while inference runs
}

export function DetectionCanvas({
  imageSrc,
  detections,
  threshold,
  isLoading = false,
}: DetectionCanvasProps) {
  // Filter down to only the detections that pass the confidence threshold
  const visible = detections.filter(d => d.score >= threshold)

  return (
    // The outer div is `relative` so child boxes can be `absolute`
    <div className={cn(
      'relative w-full overflow-hidden rounded-xl border border-border/60',
      'bg-muted/30',
      isLoading && 'animate-pulse',
    )}>
      {/* The image itself — fills the container width, height is intrinsic */}
      <Image
        src={imageSrc}
        alt="Detection target image"
        width={1280}
        height={720}
        className="w-full h-auto block"
        // unoptimized because we're using object URLs from the file picker
        // which Next.js Image can't optimise on-the-fly
        unoptimized
      />

      {/* Bounding boxes — rendered on top of the image using absolute positioning */}
      {visible.map((detection, index) => {
        const { xmin, ymin, xmax, ymax } = detection.box
        const color = colorForLabel(detection.label)

        return (
          <div
            key={`${detection.label}-${index}`}
            // Absolute positioning with percentage values so the box scales
            // with the image at every viewport width
            style={{
              position: 'absolute',
              left: `${xmin * 100}%`,
              top: `${ymin * 100}%`,
              width: `${(xmax - xmin) * 100}%`,
              height: `${(ymax - ymin) * 100}%`,
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: color,
              boxSizing: 'border-box',
            }}
          >
            {/* Label chip sits at the top-left corner of the bounding box */}
            <span
              style={{ backgroundColor: color }}
              className={cn(
                'absolute -top-5 left-0',
                'px-1.5 py-0.5 rounded-sm',
                'text-[10px] font-semibold leading-none text-white',
                'whitespace-nowrap',
              )}
            >
              {detection.label} {Math.round(detection.score * 100)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
