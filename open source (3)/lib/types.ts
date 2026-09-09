// Shared TypeScript types used across the entire application.
// Centralising types here means there's one source of truth —
// if the model output shape ever changes, you update it in one place.

// --------------------------------------------------------------------------
// Model-related types
// --------------------------------------------------------------------------
export interface BoundingBox { // basically typing for the output of the ai
  xmin: number
  ymin: number
  xmax: number
  ymax: number
}

/** A single object detected in an image. */
export interface Detection {
  label: string     // e.g. "car", "bus", "traffic light"
  score: number     // confidence, 0–1 (e.g. 0.99 means 99 % confident)
  box: BoundingBox
}

// --------------------------------------------------------------------------
// Application state types
// --------------------------------------------------------------------------

export type DetectorStatus =
  | 'idle'            // app first opens, nothing has happened yet
  | 'loading-model'   // downloading + compiling the ONNX model from HF Hub
  | 'ready'           // model is in memory, waiting for an image
  | 'detecting'       // inference is running on the selected image
  | 'done'            // inference finished, results are available
  | 'error'           // something went wrong (network, unsupported image, etc.)

