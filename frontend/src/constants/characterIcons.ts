import {
  Sword, Shield, Crown, Flame, Snowflake, Zap,
  Axe, Moon, Eye, Gem, Mountain, Compass, Feather, Star,
  User,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Sword,
  Shield,
  Crown,
  Flame,
  Snowflake,
  Zap,
  Axe,
  Moon,
  Eye,
  Gem,
  Mountain,
  Compass,
  Feather,
  Star,
}

export function getCharacterIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? User
}
