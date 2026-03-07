import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './stores/useAppStore'
import { Layout } from './components/Layout/Layout'
import { ToastContainer } from './components/Toast'
import { ConfirmDialog } from './components/ConfirmDialog'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { JournalPage } from './pages/JournalPage'
import { JournalEntryPage } from './pages/JournalEntryPage'
import { CrittersPage } from './pages/CrittersPage'
import { QuestsPage } from './pages/QuestsPage'
import { SkillsPage } from './pages/SkillsPage'
import { XPPage } from './pages/XPPage'
import { WatchPage } from './pages/WatchPage'
import { CharactersPage } from './pages/CharactersPage'
import { ConsumablesPage } from './pages/ConsumablesPage'
import { ChangelogPage } from './pages/ChangelogPage'
import { WealthPage } from './pages/WealthPage'

export function App() {
  const { user, loading, checkAuth } = useAppStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="font-display text-lg text-gold animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/:id" element={<JournalEntryPage />} />
          <Route path="/critters" element={<CrittersPage />} />
          <Route path="/quests" element={<QuestsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/xp" element={<XPPage />} />
          <Route path="/watch" element={<WatchPage />} />
          <Route path="/wealth" element={<WealthPage />} />
          <Route path="/consumables" element={<ConsumablesPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <ToastContainer />
      <ConfirmDialog />
    </>
  )
}
