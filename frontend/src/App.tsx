import './App.css'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { TopNav } from './components/TopNav'
import { useAuth } from './contexts/AuthContext'
import { AdminGroupsPage } from './pages/AdminGroupsPage'
import { AdminNewslettersPage } from './pages/AdminNewslettersPage'
import { ArchivePage } from './pages/ArchivePage'
import { CollectPage } from './pages/CollectPage'
import { LayoutEditorPage } from './pages/LayoutEditorPage'
import { LoginPage } from './pages/LoginPage'
import { NewsletterAdminPage } from './pages/NewsletterAdminPage'
import { NewslettersPage } from './pages/NewslettersPage'
import { SuperAdminPage } from './pages/SuperAdminPage'

function Shell() {
  const { user, logout } = useAuth()

  return (
    <>
      <TopNav user={user} onLogout={logout} />
      <main>
        <Outlet />
      </main>
    </>
  )
}

function App() {
  const { user, loading } = useAuth()

  const loginElement = loading ? <div className="app-shell">Chargement de la session…</div> : user ? <Navigate to="/newsletter" replace /> : <LoginPage />

  return (
    <Routes>
      <Route path="/login" element={loginElement} />
      <Route element={loading ? <div className="app-shell">Chargement de la session…</div> : user ? <Shell /> : <Navigate to="/login" replace />}> 
        <Route path="/" element={<Navigate to="/newsletter" replace />} />
        <Route path="/newsletter" element={<NewslettersPage />} />
        <Route path="/newsletters" element={<Navigate to="/newsletter" replace />} />
        <Route path="/newsletters/archive" element={<ArchivePage />} />
        <Route path="/newsletters/:id/collect" element={<CollectPage />} />
        <Route path="/newsletters/:id/admin" element={<NewsletterAdminPage />} />
        <Route path="/newsletters/:id/edit" element={<LayoutEditorPage />} />
        <Route path="/admin/groups" element={<AdminGroupsPage />} />
        <Route path="/admin/newsletters" element={<AdminNewslettersPage />} />
        <Route path="/admin/super" element={<SuperAdminPage />} />
      </Route>
    </Routes>
  )
}

export default App
