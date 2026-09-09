'use client'

// ConfidenceSlider — lets the user filter detections by confidence threshold.
//
// Important: Adjusting the slider NEVER re-runs inference. The full list of
// detections is already in memory; we simply change which ones are visible.
// This gives instant, zero-cost filtering.

interface ConfidenceSliderProps {
  value: number                       // current threshold, 0–1
  onChange: (value: number) => void   // callback when user moves slider
  disabled?: boolean
}

export function ConfidenceSlider({ value, onChange, disabled = false }: ConfidenceSliderProps) {
  const displayPct = Math.round(value * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Confidence Threshold
        </label>
        {/* Live readout of the current threshold */}
        <span className="text-sm font-mono font-semibold tabular-nums text-primary">
          {displayPct}%
        </span>
      </div>

      {/* Native range input — accessible, no extra library needed */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={displayPct}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value) / 100)}
        className="w-full accent-primary disabled:opacity-40"
      />

      <p className="text-xs text-muted-foreground">
        Only detections with ≥{displayPct}% confidence are shown.
      </p>
    </div>
  )
}
