export interface Character {
  id: string
  name: string
  player_name: string
  class: string
  level: number
  race: string
  ac: number
  hp_max: number
  icon: string
  notes: string
  created_at: string
  updated_at: string
}

export interface ActiveUser {
  id: string
  username: string
  character_id: string | null
  character_name: string
  icon: string
}

export interface Container {
  id: string
  name: string
  type: 'character' | 'bag' | 'mount' | 'cache' | 'vendor'
  character_id: string | null
  mount_id: string | null
  weight_limit: number | null
  location: string
  notes: string
  created_at: string
  updated_at: string
  version: number
  items?: Item[]
  total_weight?: number
}

export interface Mount {
  id: string
  name: string
  carrying_capacity: number | null
  notes: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Label {
  id: string
  name: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Item {
  id: number
  name: string
  quantity: number
  game_date: string
  /** @deprecated Use labels instead. Kept for backward compat with DB. */
  category: string
  container_id: string | null
  sold: boolean
  unit_weight_lbs: number | null
  unit_value_gp: number | null
  weight_override: number | null
  added_to_dndbeyond: boolean
  identified: boolean
  attuned_to: string | null
  singular: string
  notes: string
  sort_order: number
  created_at: string
  updated_at: string
  version: number
  labels: Label[]
  label_ids?: string[]
  buy_price_gp?: number
}

export interface CoinLedgerEntry {
  id: number
  game_date: string
  description: string
  cp: number
  sp: number
  ep: number
  gp: number
  pp: number
  direction: 'in' | 'out'
  item_id: number | null
  notes: string
  created_at: string
}

export interface CoinBalance {
  cp: number
  sp: number
  ep: number
  gp: number
  pp: number
  total_gp: number
}

export interface Critter {
  id: number
  name: string
  character_id: string
  hp_current: number
  hp_max: number
  ac: number
  notes: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Session {
  id: number
  game_date: string
  title: string
  body_json: string
  body_html: string
  xp_gained: number
  created_by: string | null
  images?: SessionImage[]
  created_at: string
  updated_at: string
}

export interface SessionImage {
  id: number
  session_id: number
  filename: string
  caption: string
  sort_order: number
}

export interface Skill {
  id: number
  character_id: string
  skill_name: string
  bonus: number
  proficient: boolean
  expertise: boolean
}

export interface SkillReference {
  skill_name: string
  num_proficient: number
  modifier: string
  best_combo: string
}

export interface XPEntry {
  id: number
  session_id: number | null
  game_date: string
  xp_amount: number
  description: string
  attendance?: XPAttendance[]
  created_at: string
}

export interface XPAttendance {
  id: number
  xp_entry_id: number
  character_id: string
  present: boolean
}

export interface Quest {
  id: number
  title: string
  description: string
  status: 'active' | 'completed' | 'failed' | 'on_hold'
  game_date_added: string
  game_date_completed: string
  notes: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface WatchSchedule {
  id: number
  name: string
  active: boolean
  slots?: WatchSlot[]
  created_at: string
}

export interface WatchSlot {
  id: number
  schedule_id: number
  watch_number: number
  character_id: string
  sort_order: number
}

export interface User {
  id: string
  username: string
  character_id: string | null
  created_at: string
}

export interface ChangelogEntry {
  id: number
  user_id: string | null
  table_name: string
  record_id: string
  action: 'create' | 'update' | 'delete'
  diff_json: string
  created_at: string
}

export interface ConsumableType {
  id: string
  name: string
  unit: string
  per_person_per_day: number
  sort_order: number
}

export interface ConsumableLedgerEntry {
  id: number
  consumable_type_id: string
  quantity: number
  direction: 'in' | 'out'
  game_date: string
  description: string
  head_count: number | null
  notes: string
  created_at: string
}

export interface ConsumableBalance {
  consumable_type_id: string
  name: string
  unit: string
  per_person_per_day: number
  balance: number
  days_remaining: number
}

export interface XPTotal {
  character_id: string
  character_name: string
  total_xp: number
  level: number
}

export interface ItemSummary {
  party_coin_gp: number
  net_worth_gp: number
  total_weight: number
  item_count: number
}

export interface LoginResponse {
  token: string
  user: User
}
