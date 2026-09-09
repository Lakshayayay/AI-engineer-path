/** @type {import('next').NextConfig} */
const nextConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // When bundling for the browser (client side), we must exclude any
    // Node.js native binaries that ship with @huggingface/transformers.
    // Without this, Next.js tries to bundle onnxruntime-node which crashes
    // because it contains C++ native addons that can't run in a browser.
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // onnxruntime-node is for server-side Node.js inference — not needed
        // in the browser. The library auto-falls-back to onnxruntime-web (WASM).
        'onnxruntime-node': false,
        // sharp is a native image-processing library — not needed client-side
        'sharp': false,
      }
    }
    return config
  },
  serverExternalPackages: ['onnxruntime-node', 'sharp'],
  turbopack: {},
}

export default nextConfig
