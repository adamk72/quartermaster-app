import { type ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '../../stores/useAppStore'
import {
  Sword, BookOpen, Bug, ScrollText, Brain, Star,
  Shield, Users, History, LayoutDashboard, Menu, X, LogOut, Apple,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inventory', label: 'Inventory', icon: Sword },
  { path: '/journal', label: 'Journal', icon: BookOpen },
  { path: '/critters', label: 'Critters', icon: Bug },
  { path: '/quests', label: 'Quests', icon: ScrollText },
  { path: '/skills', label: 'Skills', icon: Brain },
  { path: '/xp', label: 'XP', icon: Star },
  { path: '/watch', label: 'Watch', icon: Shield },
  { path: '/consumables', label: 'Consumables', icon: Apple },
  { path: '/characters', label: 'Characters', icon: Users },
  { path: '/changelog', label: 'Changelog', icon: History },
]

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAppStore()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-surface border-b border-border p-4">
        <button onClick={() => setSidebarOpen(true)} className="p-1 text-parchment-dim hover:text-gold transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="font-display text-lg font-bold text-gold">Treasure Tracker</h1>
        <div className="w-6" />
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-full w-64 bg-surface z-50 transition-transform lg:translate-x-0 border-r border-border',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h1 className="font-display text-lg font-bold text-gold tracking-wide">Treasure Tracker</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-parchment-muted hover:text-parchment transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-0.5">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                  active
                    ? 'bg-gold/10 text-gold border-l-2 border-gold ml-0 pl-[10px]'
                    : 'text-parchment-dim hover:bg-card hover:text-parchment border-l-2 border-transparent ml-0 pl-[10px]'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="font-heading font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-parchment-muted font-medium">{user?.username}</span>
            <button
              onClick={logout}
              className="text-parchment-muted hover:text-wine transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
