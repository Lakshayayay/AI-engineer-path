// lib/utils.ts — shared utility functions
//
// cn() is the standard shadcn/ui class-merging utility.
// It combines clsx (conditional classes) with tailwind-merge (deduplication)
// so you can write things like:
//   cn('px-4 py-2', isActive && 'bg-foreground text-background')
// without worrying about conflicting Tailwind classes.

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
