'use client'

// useDetector — the core AI hook.
//
// Responsibilities:
//   1. Load the @huggingface/transformers object-detection model exactly once
//      (stored as a module-level singleton so it survives React re-renders and
//      even page transitions within the same browser tab).
//   2. Expose a `detect(imageSrc)` function that runs inference on any image URL.
//   3. Track loading/detection status so the UI can display meaningful feedback.
//   4. Report model download progress (the ONNX file is ~40 MB on first visit).
//
// Usage:
//   const { status, progress, detections, detect } = useDetector()

import { useState, useCallback, useRef } from 'react'
import type { Detection, DetectorStatus } from '@/lib/types'

// ─── Singleton ───────────────────────────────────────────────────────────────
//
// We store the pipeline instance OUTSIDE the React component so:
//   • It survives re-renders (no redundant downloads)
//   • It can be reused across multiple component mounts
//
// The `any` type is intentional — Transformers.js doesn't ship a standalone
// TypeScript type for the pipeline return value. We cast when needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let detectorSingleton: any = null
let loadingPromise: Promise<void> | null = null // prevents duplicate load calls

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseDetectorReturn {
  status: DetectorStatus
  progress: number          // 0–100, only meaningful while status === 'loading-model'
  detections: Detection[]
  detect: (imageSrc: string) => Promise<void>
  reset: () => void
}

export function useDetector(): UseDetectorReturn {
  const [status, setStatus] = useState<DetectorStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [detections, setDetections] = useState<Detection[]>([])

  // Track whether this hook instance is still mounted — avoids setState on
  // an unmounted component if the user navigates away mid-inference.
  const mountedRef = useRef(true)

  const loadModel = useCallback(async () => {
    // If model is already loaded, skip
    if (detectorSingleton) return

    // If another call is already loading, await that same promise
    if (loadingPromise) {
      await loadingPromise
      return
    }

    setStatus('loading-model')
    setProgress(0)

    // We import dynamically so Next.js doesn't attempt to server-side-render
    // this module (it needs browser APIs like WebAssembly and Cache API).
    loadingPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')

      // Tell Transformers.js not to look for model files on our local Next.js
      // dev server (which would return index.html for unknown paths, not JSON).
      env.allowLocalModels = false

      detectorSingleton = await pipeline(
        'object-detection',
        'Xenova/detr-resnet-50',
        {
          // This callback fires multiple times during the model download.
          // We use it to drive a progress bar in the UI.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progress_callback: (progressData: any) => {
            if (progressData.status === 'progress' && progressData.total) {
              const pct = Math.round((progressData.loaded / progressData.total) * 100)
              if (mountedRef.current) setProgress(pct)
            }
          },
        }
      )
    })()

    await loadingPromise
    loadingPromise = null

    if (mountedRef.current) {
      setStatus('ready')
      setProgress(100)
    }
  }, [])

  const detect = useCallback(async (imageSrc: string) => {
    // Step 1: make sure the model is loaded
    await loadModel()

    if (!detectorSingleton) return

    if (mountedRef.current) {
      setStatus('detecting')
      setDetections([])
    }

    // Step 2: run inference
    // `percentage: true` returns box coordinates as 0-to-1 fractions
    // so bounding boxes stay accurate regardless of the rendered image size.
    // `threshold: 0.5` means we accept anything the model is at least 50 % sure about;
    // the UI's confidence slider can further filter results client-side.
    const raw = await detectorSingleton(imageSrc, {
      threshold: 0.5,
      percentage: true,
    })

    if (mountedRef.current) {
      setDetections(raw as Detection[])
      setStatus('done')
    }
  }, [loadModel])

  const reset = useCallback(() => {
    setStatus(detectorSingleton ? 'ready' : 'idle')
    setDetections([])
    setProgress(0)
  }, [])

  return { status, progress, detections, detect, reset }
}
