# DetectAI — In-Browser Object Detection

**DetectAI** is a private, client-side web application for real-time computer vision and object detection powered by [Transformers.js](https://huggingface.co/docs/transformers.js) and Next.js.

All AI inference runs **100% inside your web browser** using WebAssembly (WASM) and WebGPU via ONNX Runtime Web. Images are never uploaded to any server or external cloud, providing total privacy, zero backend operational costs, and offline capabilities.

---

## Current Release: Version 1 (Stable)

Version 1 is focused on delivering a rock-solid, high-performance core object detection experience for static images:

1. **100% Client-Side AI Inference**  
   Runs the `Xenova/detr-resnet-50` model directly on device via Transformers.js. No third-party API keys or external inference servers required.
2. **Transparent Model Lifecycle & Progress**  
   Tracks the first-time ONNX model download with live byte-level progress percentages and state machine feedback (`idle` → `loading-model` → `ready` → `detecting` → `done`).
3. **Flexible Image Input**  
   Supports drag-and-drop file upload, native file picker browsing (JPG, PNG, WebP), and a one-click bundled demo image (`road.jpeg`).
4. **Responsive Visual Bounding Boxes**  
   Renders normalized bounding box overlays that automatically scale and align to the image on any display resolution, accompanied by a deterministic label color-coding system.
5. **Zero-Latency Confidence Filtering**  
   An interactive confidence threshold slider (0%–100%) that instantly re-filters visible objects and bounding boxes client-side with zero re-inference overhead.
6. **Detailed Inspection & Summary Badges**  
   Dynamic emoji-tagged count badges (`🚗 car × 4`, `🚦 traffic light × 2`) alongside an inspectable coordinates table showing model confidence scores and normalized spatial coordinates.

---

## Roadmap: Version 2 (Upcoming)

The following capabilities are planned for the Version 2 milestone:

1. **Live Video Monitoring**  
   - Real-time object detection stream via connected webcam or live video feeds.
   - High-throughput frame sampling with performance optimizations for smooth on-device FPS.
2. **Authentication & Cloud Detection History**  
   - Integrated user authentication (via Supabase Auth).
   - Cloud-persisted detection history allowing users to store snapshots, view detection metrics over time, and sync history across devices.

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Machine Learning**: [@huggingface/transformers](https://huggingface.co/docs/transformers.js) (v4.2.0) with ONNX Runtime Web
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Typography & Icons**: Geist Font & [Lucide React](https://lucide.dev/)
- **Language**: TypeScript 5.9

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18.17 or higher
- `npm`, `pnpm`, or `bun`

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note on first run:** When running detection for the first time, the browser will download the quantized ONNX model files (~40 MB) from the Hugging Face Hub. Once downloaded, the model is cached in the browser's Cache API for instant subsequent loads.

### Production Build

```bash
npm run build
npm run start
```

---

## Architecture Note

Because Next.js runs both server-side and client-side code, `next.config.ts` includes explicit aliases for `onnxruntime-node` and `sharp` across Webpack and Turbopack. This ensures native Node.js C++ binaries are excluded from client bundles, enabling clean in-browser WebAssembly execution.
