import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInventoryStore } from '../stores/useInventoryStore'
import { api } from '../api/client'
import { Sword, Coins, Weight, Package, BookOpen, Bug, ScrollText, Star, Apple } from 'lucide-react'
import { toast } from '../stores/useToastStore'
import clsx from 'clsx'
import type { ConsumableBalance } from '../types'

export function DashboardPage() {
  const { summary, characters, fetchSummary, fetchCharacters } = useInventoryStore()
  const [consumables, setConsumables] = useState<ConsumableBalance[]>([])

  useEffect(() => {
    fetchSummary()
    fetchCharacters()
    api.get<ConsumableBalance[]>('/consumables/balances').then(setConsumables).catch((e) => {
      toast.error(e instanceof Error ? e.message : 'Failed to load consumables')
    })
  }, [fetchSummary, fetchCharacters])

  const cards = [
    { label: 'Party Coin', value: summary ? `${summary.party_coin_gp.toFixed(2)} gp` : '...', icon: Coins, accent: 'text-gold bg-gold/10' },
    { label: 'Net Worth', value: summary ? `${summary.net_worth_gp.toFixed(2)} gp` : '...', icon: Sword, accent: 'text-emerald bg-emerald/10' },
    { label: 'Total Weight', value: summary ? `${summary.total_weight.toFixed(1)} lbs` : '...', icon: Weight, accent: 'text-sky bg-sky/10' },
    { label: 'Items', value: summary ? String(summary.item_count) : '...', icon: Package, accent: 'text-arcane bg-arcane/10' },
  ]

  return (
    <div>
      <h2 className="font-heading text-3xl font-bold text-parchment mb-6">Dashboard</h2>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, accent }, i) => (
          <div
            key={label}
            className="tt-card animate-[slideIn_0.3s_ease-out] hover:border-border-light transition-colors"
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'backwards' }}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-parchment-muted">{label}</p>
                <p className="text-xl font-heading font-bold text-parchment">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Consumables */}
      {consumables.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-lg font-semibold text-parchment">Consumables</h3>
            <Link to="/consumables" className="text-sm text-gold hover:text-gold-bright transition-colors">Manage</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {consumables.map((b) => {
              const urgent = b.days_remaining >= 0 && b.days_remaining < 3
              const warning = b.days_remaining >= 3 && b.days_remaining < 7
              return (
                <div key={b.consumable_type_id} className={clsx(
                  'tt-card',
                  urgent && 'border-wine/40 bg-wine/5',
                  warning && 'border-amber/40 bg-amber/5',
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-semibold text-parchment">{b.name}</span>
                    <span className="text-2xl font-heading font-bold text-parchment">
                      {b.balance % 1 === 0 ? b.balance : b.balance.toFixed(1)}
                    </span>
                  </div>
                  <div className={clsx(
                    'text-sm mt-1',
                    urgent ? 'text-wine font-semibold' :
                    warning ? 'text-amber' :
                    'text-parchment-muted',
                  )}>
                    {b.days_remaining >= 0
                      ? `${b.days_remaining % 1 === 0 ? b.days_remaining : b.days_remaining.toFixed(1)} days for the party`
                      : `${b.unit}`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Party Members */}
        <div className="tt-card">
          <h3 className="font-heading text-lg font-semibold text-parchment mb-4">Party Members</h3>
          {characters.length === 0 ? (
            <p className="text-parchment-muted text-sm">
              No characters yet. <Link to="/characters" className="text-gold hover:text-gold-bright">Add some</Link>
            </p>
          ) : (
            <div className="space-y-2">
              {characters.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="font-heading font-semibold text-parchment">{c.name}</span>
                    <span className="text-sm text-parchment-muted ml-2">
                      Level {c.level} {c.race} {c.class}
                    </span>
                  </div>
                  <div className="text-sm text-parchment-dim font-mono">
                    AC {c.ac} | HP {c.hp_max}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="tt-card">
          <h3 className="font-heading text-lg font-semibold text-parchment mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/inventory', label: 'Manage Inventory', icon: Sword },
              { to: '/journal', label: 'Session Journal', icon: BookOpen },
              { to: '/consumables', label: 'Consumables', icon: Apple },
              { to: '/critters', label: 'Critter HP', icon: Bug },
              { to: '/quests', label: 'Quest Tracker', icon: ScrollText },
              { to: '/xp', label: 'XP Tracker', icon: Star },
            ].map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2.5 px-4 py-3 bg-surface rounded-lg text-sm font-medium text-parchment-dim hover:bg-card-hover hover:text-gold transition-all duration-150 border border-transparent hover:border-border"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
