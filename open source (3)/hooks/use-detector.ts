'use client'

/**
 * @file hooks/use-detector.ts
 * @description Production-grade React custom hook for in-browser AI object detection.
 * 
 * ARCHITECTURAL OVERVIEW:
 * In modern frontend engineering, we separate UI presentation (JSX) from complex
 * asynchronous business logic (neural network lifecycle, WebAssembly instantiation,
 * download streaming). This hook encapsulates all interactions with Hugging Face's
 * Transformers.js, exposing an ergonomic, type-safe API for components.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Lazy-loads and instantiates the ONNX model once as a singleton.
 * 2. Streams download progress (0–100%) to drive feedback spinners/progress bars.
 * 3. Executes inference on local image URLs using normalized coordinates.
 * 4. Implements defensive error handling and component unmount safety guards.
 * 
 * @example
 * ```tsx
 * const { status, progress, detections, detect, error, reset } = useDetector()
 * 
 * const handleUpload = async (imageBlobUrl: string) => {
 *   await detect(imageBlobUrl)
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Detection, DetectorStatus } from '@/lib/types'

// ─── CONFIGURATION CONSTANTS ────────────────────────────────────────────────
// Industry practice: Avoid magic strings/numbers scattered in business logic.
// Centralizing config makes model upgrades and tuning straightforward.

/** The Hugging Face repository ID containing the quantized ONNX weights */
const MODEL_ID = 'Xenova/detr-resnet-50'

/** The ML pipeline task identifier */
const TASK_NAME = 'object-detection'

/**
 * Base score threshold passed to the ONNX pipeline.
 * We set this to 0.5 (50%) at inference time so the model captures candidate
 * objects, allowing the client-side UI slider to filter instantly without re-inference.
 */
const INFERENCE_SCORE_THRESHOLD = 0.5

// ─── MODULE-LEVEL SINGLETON STATE ───────────────────────────────────────────
//
// WHY OUTSIDE THE HOOK?
// In React, code inside a hook body re-runs whenever state changes. If the model
// were stored in `useState` or instantiated inside the hook, navigating routes or
// re-mounting components would trigger duplicate ~40 MB downloads and re-allocate
// hundreds of megabytes of WebAssembly memory.
//
// Storing the pipeline at the module level creates a singleton that lives for the
// lifetime of the browser tab.

/**
 * Cached instance of the Transformers.js pipeline.
 * Using `any` because Transformers.js does not yet export an official TypeScript interface
 * for the dynamic pipeline return value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let detectorSingleton: any = null

/**
 * Mutex / Promise lock to prevent race conditions.
 * If two components call `detect()` or `loadModel()` simultaneously before the model
 * finishes downloading, both await this identical promise rather than starting two downloads.
 */
let loadingPromise: Promise<void> | null = null

// ─── PUBLIC CONTRACT (HOOK RETURN TYPE) ──────────────────────────────────────

/**
 * Public API contract returned by the `useDetector` hook.
 * 
 * In industry development, defining an explicit return interface (instead of
 * relying on implicit type inference) guarantees stability, powers IDE auto-completion,
 * and makes unit testing / mocking predictable.
 */
export interface UseDetectorReturn {
  /** Current state of the detector engine */
  status: DetectorStatus
  
  /** Model download progress percentage (0–100). Active when status === 'loading-model' */
  progress: number
  
  /** Array of objects detected from the most recent inference run */
  detections: Detection[]
  
  /** Any error encountered during model loading or inference, or null if healthy */
  error: Error | null
  
  /**
   * Runs object detection on a provided image source (blob URL, data URL, or static asset).
   * Automatically initializes the model on first call if not already loaded.
   */
  detect: (imageSrc: string) => Promise<void>
  
  /** Resets detection results back to idle/ready state */
  reset: () => void
}

// ─── HOOK IMPLEMENTATION ────────────────────────────────────────────────────

/**
 * Custom React hook for client-side object detection.
 *
 * @returns {UseDetectorReturn} API methods, state variables, and detection results.
 */
export function useDetector(): UseDetectorReturn {
  // ── State variables ────────────────────────────────────────────────────────
  const [status, setStatus] = useState<DetectorStatus>('idle')
  const [progress, setProgress] = useState<number>(0)
  const [detections, setDetections] = useState<Detection[]>([])
  const [error, setError] = useState<Error | null>(null)

  /**
   * Component Lifecycle Guard (Memory Leak Prevention):
   * 
   * If a user initiates a heavy operation (e.g. downloading a 40 MB model or running
   * 1-second inference) and navigates away before it finishes, React throws a warning:
   * "Can't perform a React state update on an unmounted component."
   * 
   * `mountedRef` tracks whether this specific component instance is still on screen
   * before calling any `setState`.
   */
  const mountedRef = useRef<boolean>(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      // Cleanup function executed when the component unmounts
      mountedRef.current = false
    }
  }, [])

  // ── Model Initialization (Lazy Loader) ─────────────────────────────────────
  const loadModel = useCallback(async (): Promise<void> => {
    // Fast path: model is already compiled and resident in memory
    if (detectorSingleton) {
      return
    }

    // Concurrency lock: another execution is already downloading the weights
    if (loadingPromise) {
      await loadingPromise
      return
    }

    if (mountedRef.current) {
      setStatus('loading-model')
      setProgress(0)
      setError(null)
    }

    // Initiate the single loading promise
    loadingPromise = (async () => {
      try {
        /**
         * Dynamic Import:
         * We import `@huggingface/transformers` dynamically inside this function
         * rather than at top-level. This prevents Next.js from attempting to evaluate
         * WebAssembly / WebGPU during Server-Side Rendering (SSR).
         */
        const { pipeline, env } = await import('@huggingface/transformers')

        // Prevent library from looking for model checkpoints on local Next.js dev server
        env.allowLocalModels = false

        detectorSingleton = await pipeline(TASK_NAME, MODEL_ID, {
          /**
           * Streaming progress callback provided by Transformers.js.
           * Emits download byte metrics so the UI can render a live progress indicator.
           */
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progress_callback: (progressData: any) => {
            if (progressData.status === 'progress' && progressData.total) {
              const percent = Math.round((progressData.loaded / progressData.total) * 100)
              if (mountedRef.current) {
                setProgress(percent)
              }
            }
          },
        })

        if (mountedRef.current) {
          setStatus('ready')
          setProgress(100)
        }
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        if (mountedRef.current) {
          setError(errorObj)
          setStatus('error')
        }
        // Invalidate singleton so subsequent attempts can retry
        detectorSingleton = null
        throw errorObj
      } finally {
        // Unlock mutex when resolution (success or failure) finishes
        loadingPromise = null
      }
    })()

    await loadingPromise
  }, [])

  // ── Inference Execution ────────────────────────────────────────────────────
  const detect = useCallback(
    async (imageSrc: string): Promise<void> => {
      try {
        setError(null)

        // Ensure neural network weights are loaded into memory first
        await loadModel()

        if (!detectorSingleton) {
          throw new Error('Detector model failed to initialize.')
        }

        if (mountedRef.current) {
          setStatus('detecting')
          setDetections([])
        }

        /**
         * Model Inference:
         * - `percentage: true`: returns bounding box coordinates normalized between 0.0 and 1.0.
         *   This is critical for responsive web design because the coordinates automatically
         *   scale to fit any screen resolution or aspect ratio without re-computing pixel offsets.
         * - `threshold: 0.5`: filters out extreme low-confidence noise from the raw tensor output.
         */
        const rawResults = await detectorSingleton(imageSrc, {
          threshold: INFERENCE_SCORE_THRESHOLD,
          percentage: true,
        })

        if (mountedRef.current) {
          setDetections(rawResults as Detection[])
          setStatus('done')
        }
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        if (mountedRef.current) {
          setError(errorObj)
          setStatus('error')
        }
      }
    },
    [loadModel],
  )

  // ── State Reset ────────────────────────────────────────────────────────────
  const reset = useCallback((): void => {
    setStatus(detectorSingleton ? 'ready' : 'idle')
    setDetections([])
    setProgress(0)
    setError(null)
  }, [])

  return {
    status,
    progress,
    detections,
    error,
    detect,
    reset,
  }
}
