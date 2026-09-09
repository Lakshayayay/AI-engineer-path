'use client'

// Dashboard page — the main detection workspace.
//
// This is a Client Component (marked with 'use client') because:
//   • It uses React state (selected image, threshold, detections)
//   • It calls useDetector() which uses browser APIs (WebAssembly, CacheStorage)
//   • Next.js would error if we ran @huggingface/transformers on the server
//
// Layout (desktop):
//   ┌──────────────────────────────────────────┐
//   │ Header: title + status bar               │
//   ├────────────────────┬─────────────────────┤
//   │ Image canvas       │ Controls panel      │
//   │ (detection boxes)  │ - upload zone       │
//   │                    │ - confidence slider │
//   │                    │ - summary cards     │
//   └────────────────────┴─────────────────────┘
//   │ Detection list (full width)              │
//   └──────────────────────────────────────────┘

import { useState, useCallback } from 'react'
import { useDetector } from '@/hooks/use-detector'
import { DetectionCanvas } from '@/components/detection-canvas'
import { UploadZone } from '@/components/upload-zone'
import { ConfidenceSlider } from '@/components/confidence-slider'
import { SummaryCards } from '@/components/summary-cards'
import { DetectionList } from '@/components/detection-list'
import { ModelStatusBar } from '@/components/model-status-bar'
import { Cpu } from 'lucide-react'

// Default demo image bundled with the app (public/road.jpeg)
const DEMO_IMAGE_SRC = '/road.jpeg'
const DEMO_IMAGE_NAME = 'road.jpeg (demo)'

// Default confidence threshold: show detections ≥ 50% confident
const DEFAULT_THRESHOLD = 0.5

export default function DashboardPage() {
  const { status, progress, detections, detect } = useDetector()

  // Currently displayed image source (object URL or static path)
  const [imageSrc, setImageSrc] = useState<string>(DEMO_IMAGE_SRC)
  const [fileName, setFileName] = useState<string>(DEMO_IMAGE_NAME)

  // Confidence threshold — controlled by the slider, applied client-side only
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD)

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Called by UploadZone when the user picks a new image
  const handleImageSelect = useCallback(async (src: string, name: string) => {
    setImageSrc(src)
    setFileName(name)
    // Immediately run inference on the new image
    await detect(src)
  }, [detect])

  // Run detection on the bundled demo image
  const handleRunDemo = useCallback(async () => {
    setImageSrc(DEMO_IMAGE_SRC)
    setFileName(DEMO_IMAGE_NAME)
    await detect(DEMO_IMAGE_SRC)
  }, [detect])

  const isBusy = status === 'loading-model' || status === 'detecting'
  const isDone = status === 'done'

  // Build a 4-letter abbreviation of status for the header badge
  const statusLabels: Record<string, string> = {
    idle: 'Idle',
    'loading-model': 'Loading model',
    ready: 'Ready',
    detecting: 'Detecting',
    done: 'Done',
    error: 'Error',
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">Object Detection</h1>
            {/* Live status feedback */}
            <ModelStatusBar
              status={status}
              progress={progress}
              detectionCount={detections.length}
            />
          </div>

          {/* Status badge (top-right) */}
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/60 rounded-full px-2.5 py-1 bg-muted/30 whitespace-nowrap">
            <Cpu className="h-3 w-3" />
            {statusLabels[status] ?? status}
          </span>
        </div>
      </header>

      {/* ── Main workspace ───────────────────────────────────────────────── */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* Left column — image canvas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="font-mono truncate max-w-md">Target: {fileName}</span>
            </div>
            <DetectionCanvas
              imageSrc={imageSrc}
              detections={detections}
              threshold={threshold}
              isLoading={isBusy}
            />

            {/* Detection table — below the image, full width of left column */}
            {isDone && (
              <div className="space-y-2">
                <p className="text-sm font-medium">All Detections</p>
                <DetectionList detections={detections} threshold={threshold} />
              </div>
            )}
          </div>

          {/* Right column — controls panel */}
          <div className="space-y-5">

            {/* Upload zone */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Image</p>
              <UploadZone onImageSelect={handleImageSelect} disabled={isBusy} />

              {/* Demo button */}
              <button
                onClick={handleRunDemo}
                disabled={isBusy}
                className="w-full rounded-lg border border-border/60 py-2 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                Try demo image (road.jpeg)
              </button>
            </div>

            {/* Confidence slider */}
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <ConfidenceSlider
                value={threshold}
                onChange={setThreshold}
              />
            </div>

            {/* Summary cards — only appear after detection */}
            {isDone && (
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <SummaryCards detections={detections} threshold={threshold} />
              </div>
            )}

          </div>
        </div>
      </div>

    </div>
  )
}
