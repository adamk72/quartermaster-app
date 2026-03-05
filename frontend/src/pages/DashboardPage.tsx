import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInventoryStore } from '../stores/useInventoryStore'
import { api } from '../api/client'
import { Sword, Coins, Weight, Package } from 'lucide-react'
import clsx from 'clsx'
import type { ConsumableBalance } from '../types'

export function DashboardPage() {
  const { summary, characters, fetchSummary, fetchCharacters } = useInventoryStore()
  const [consumables, setConsumables] = useState<ConsumableBalance[]>([])

  useEffect(() => {
    fetchSummary()
    fetchCharacters()
    api.get<ConsumableBalance[]>('/consumables/balances').then(setConsumables).catch(() => {})
  }, [fetchSummary, fetchCharacters])

  const cards = [
    { label: 'Party Coin', value: summary ? `${summary.party_coin_gp.toFixed(2)} gp` : '...', icon: Coins, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Net Worth', value: summary ? `${summary.net_worth_gp.toFixed(2)} gp` : '...', icon: Sword, color: 'bg-green-50 text-green-700' },
    { label: 'Total Weight', value: summary ? `${summary.total_weight.toFixed(1)} lbs` : '...', icon: Weight, color: 'bg-blue-50 text-blue-700' },
    { label: 'Items', value: summary ? String(summary.item_count) : '...', icon: Package, color: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Consumables */}
      {consumables.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Consumables</h3>
            <Link to="/consumables" className="text-sm text-blue-600 hover:underline">Manage</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {consumables.map((b) => {
              const urgent = b.days_remaining >= 0 && b.days_remaining < 3
              const warning = b.days_remaining >= 3 && b.days_remaining < 7
              return (
                <div key={b.consumable_type_id} className={clsx(
                  'bg-white rounded-xl shadow-sm border p-4',
                  urgent && 'border-red-300 bg-red-50',
                  warning && 'border-yellow-300 bg-yellow-50',
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-2xl font-bold">
                      {b.balance % 1 === 0 ? b.balance : b.balance.toFixed(1)}
                    </span>
                  </div>
                  <div className={clsx(
                    'text-sm mt-1',
                    urgent ? 'text-red-700 font-semibold' :
                    warning ? 'text-yellow-700' :
                    'text-gray-500',
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
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-lg font-semibold mb-4">Party Members</h3>
          {characters.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No characters yet. <Link to="/characters" className="text-blue-600 hover:underline">Add some</Link>
            </p>
          ) : (
            <div className="space-y-2">
              {characters.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      Level {c.level} {c.race} {c.class}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    AC {c.ac} | HP {c.hp_max}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/inventory', label: 'Manage Inventory' },
              { to: '/journal', label: 'Session Journal' },
              { to: '/consumables', label: 'Consumables' },
              { to: '/critters', label: 'Critter HP' },
              { to: '/quests', label: 'Quest Tracker' },
              { to: '/xp', label: 'XP Tracker' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="px-4 py-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
