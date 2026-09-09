'use client'

// UploadZone — drag-and-drop + click-to-browse image picker.
//
// Responsibilities:
//   • Let the user pick a local image file (or drag one onto the zone)
//   • Convert the File into an object URL for the <img> element and the detector
//   • Fall back to the bundled road.jpeg when no file has been chosen yet
//   • Call onImageSelect(src) so the parent can run inference

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import { Upload, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  // Called with the image source (object URL or static path) whenever the user
  // picks a file. Parent is responsible for running inference.
  onImageSelect: (src: string, fileName: string) => void
  // Whether the detector is currently busy — disables picking while inferring
  disabled?: boolean
}

export function UploadZone({ onImageSelect, disabled = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Accept any image MIME type
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    // createObjectURL gives us a temporary browser-internal URL for the file.
    // It's revoked automatically when the tab closes.
    const src = URL.createObjectURL(file)
    onImageSelect(src, file.name)
  }, [onImageSelect])

  // ── Drag events ──────────────────────────────────────────────────────────

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()          // Necessary to allow drop
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── Click-to-browse ───────────────────────────────────────────────────────

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        // Base styles
        'relative flex flex-col items-center justify-center gap-3',
        'w-full min-h-[200px] rounded-xl border-2 border-dashed',
        'transition-all duration-200 cursor-pointer select-none',
        // Default border
        'border-border/60 hover:border-primary/60 hover:bg-muted/30',
        // Active drag-over state
        isDragging && 'border-primary bg-primary/5 scale-[1.01]',
        // Disabled state while inferring
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {/* Hidden native file input — triggered programmatically */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      <div className="flex flex-col items-center gap-2 p-6 text-center">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          'bg-muted transition-colors',
          isDragging ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
        )}>
          {isDragging ? (
            <ImageIcon className="h-6 w-6" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? 'Drop your image here' : 'Upload an image'}
          </p>
          <p className="text-xs text-muted-foreground">
            Drag & drop or click to browse — JPG, PNG, WebP supported
          </p>
        </div>
      </div>
    </div>
  )
}
