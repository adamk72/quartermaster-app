export const CONTAINER_TYPES = ['character', 'bag', 'mount', 'cache', 'vendor'] as const

export const QUEST_STATUSES = ['active', 'completed', 'failed', 'on_hold'] as const

export const DND_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics',
  'Deception', 'History', 'Insight', 'Intimidation',
  'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand',
  'Stealth', 'Survival',
] as const

export const AUTH_TOKEN_KEY = 'token'

export const API_BASE = '/api/v1'

export const MAX_ATTUNEMENT_SLOTS = 3

export const DENOM_TO_CP: Record<string, number> = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 }

export const DEFAULT_LABEL_COLOR = '#7d7568'

export const TOAST_DURATION_MS = 4000

export const CHANGELOG_PAGE_SIZE = 50

export const CONSUMABLE_URGENT_DAYS = 3
export const CONSUMABLE_WARNING_DAYS = 7

export const GEMS_JEWELRY_LABEL_IDS = new Set(['jewelry', 'gems'])

/** Expand 3-digit hex (#abc) to 6-digit (#aabbcc) so appending alpha chars works correctly */
export function hexWithAlpha(hex: string, alpha: string): string {
  const h = hex.startsWith('#') ? hex.slice(1) : hex
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return `#${full}${alpha}`
}

export const QUEST_STATUS_COLORS: Record<string, string> = {
  active: 'bg-sky/15 text-sky',
  completed: 'bg-emerald/15 text-emerald',
  failed: 'bg-wine/15 text-wine',
  on_hold: 'bg-amber/15 text-amber',
}
