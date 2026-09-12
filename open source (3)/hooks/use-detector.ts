'use client' // tells react that this component is client only (browser)

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Detection, DetectorStatus } from '@/lib/types'

// ── Configuration ───────────────────────────────────────────────────────────
const MODEL_ID = 'Xenova/detr-resnet-50'
const TASK_NAME = 'object-detection'
const INFERENCE_SCORE_THRESHOLD = 0.5

// model importing variable should be outside the detector function 
// becuase after every state change it owuldnt have to redoownlaod everything

let detectorSingleton: any = null
let loadingPromise: Promise<void> | null = null
// the reason we need a promise here is so that if the component is re-rendered 
// even once the model is loaded it doesnt reload again

export interface UseDetectorReturn { // schematype for the hook return value 
  status: DetectorStatus
  progress: number
  detections: Detection[]
  error: Error | null
  detect: (imageSrc: string) => Promise<void>
  reset: () => void
}

export function useDetector(): UseDetectorReturn { // making it like a custom hook 
  // and then tracking the changes as well
  const [status, setStatus] = useState<DetectorStatus>('idle')
  const [progress, setProgress] = useState<number>(0)
  const [detections, setDetections] = useState<Detection[]>([])
  const [error, setError] = useState<Error | null>(null)

  // Track mount status to avoid state updates on unmounted components
  const mountedRef = useRef(true)
  useEffect(() => { // the moment the component is loaded for the first time
    mountedRef.current = true
    return () => { //returnig the function when the component is unmounted
      mountedRef.current = false
    }
  }, [])

  // ── Step 1 & 2: Load Model from Hugging Face ──────────────────────────────
  const loadModel = useCallback(async (): Promise<void> => {
    if (detectorSingleton) return

    // If another call is already loading the model, await that existing promise
    if (loadingPromise) {
      await loadingPromise
      return
    }

    if (mountedRef.current) {
      setStatus('loading-model')
      setProgress(0)
      setError(null)
    }

    loadingPromise = (async () => { // a single call of detection
      try {
        // Dynamically import client-side only (prevents Next.js SSR errors)
        const { pipeline, env } = await import('@huggingface/transformers')
        env.allowLocalModels = false

        // Progress callback to update download percentage step-by-step
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleDownloadProgress = (data: any) => {
          if (data.status === 'progress' && data.total) {
            const fraction = data.loaded / data.total
            const percent = Math.round(fraction * 100)

            if (mountedRef.current) {
              setProgress(percent)
            }
          }
        }

        detectorSingleton = await pipeline(TASK_NAME, MODEL_ID, {
          progress_callback: handleDownloadProgress,
        })

        if (mountedRef.current) {
          setStatus('ready')
          setProgress(100)
        }
      } catch (err) {
        // Step 1: Standardize the caught error into a true Error object
        let errorObj: Error
        if (err instanceof Error) {
          errorObj = err
        } else {
          errorObj = new Error(String(err))
        }

        // Step 2: Notify the UI of the error (only if still mounted)
        if (mountedRef.current) {
          setError(errorObj)
          setStatus('error')
        }

        // Step 3: Clear any partial/corrupted model reference
        detectorSingleton = null

        // Step 4: Re-throw so upstream callers know initialization failed
        throw errorObj
      } finally {
        // Step 5: Always clear the in-flight loading promise so future attempts can run
        loadingPromise = null
      }
    })()

    await loadingPromise
  }, [])

  // ── Step 3: Run Inference on Image ────────────────────────────────────────
  const detect = useCallback(
    async (imageSrc: string): Promise<void> => {
      try {
        setError(null)
        await loadModel()

        if (!detectorSingleton) {
          throw new Error('Detector model failed to initialize.')
        }

        if (mountedRef.current) {
          setStatus('detecting')
          setDetections([])
        }

        // Run object detection (percentage: true returns 0.0-1.0 normalized coordinates)
        const rawResults: any = await detectorSingleton(imageSrc, {
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

  // ── Reset State ───────────────────────────────────────────────────────────
  const reset = useCallback((): void => { // its a call back fucntion which sets
    // everything to start
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
