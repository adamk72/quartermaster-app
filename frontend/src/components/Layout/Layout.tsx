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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-gray-900 text-white p-4">
        <button onClick={() => setSidebarOpen(true)} className="p-1">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Treasure Tracker</h1>
        <div className="w-6" />
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-50 transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold">Treasure Tracker</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-2 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                location.pathname === path
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">{user?.username}</span>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
