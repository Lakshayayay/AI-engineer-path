// Deterministic color palette for bounding-box labels.
//
// WHY deterministic instead of random?
// Random colors (Math.random()) change on every render/page-load, making it
// impossible to visually associate labels with a consistent color over time.
// A deterministic mapping means "car" is always blue, "bus" is always purple,
// which trains the user's eye and looks more professional.
//
// The palette is derived by hashing the label string into an index — so any
// previously unseen label still gets a distinct, reproducible color.

const PALETTE = [
  '#3B82F6', // blue-500   → car
  '#10B981', // emerald-500 → truck
  '#F59E0B', // amber-500  → traffic light
  '#8B5CF6', // violet-500 → bus
  '#EF4444', // red-500    → person
  '#06B6D4', // cyan-500   → bicycle
  '#F97316', // orange-500 → motorcycle
  '#EC4899', // pink-500   → dog / cat
  '#84CC16', // lime-500   → boat
  '#6366F1', // indigo-500 → airplane
  '#14B8A6', // teal-500   → chair
  '#A855F7', // purple-500 → other
]

/**
 * Returns a consistent hex color string for a given detection label.
 * The same label always returns the same color within a session.
 *
 * @param label - e.g. "car", "bus", "traffic light"
 */
export function colorForLabel(label: string): string {
  // Simple djb2-inspired hash — fast, deterministic, no dependencies
  let hash = 5381
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 33) ^ label.charCodeAt(i)
  }
  // Keep it positive and wrap into palette range
  const index = Math.abs(hash) % PALETTE.length
  return PALETTE[index]
}
