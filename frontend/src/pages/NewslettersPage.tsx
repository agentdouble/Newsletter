import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchGroups, fetchNewsletters } from '../api/client'
import { NewsletterList } from '../components/NewsletterList'
import { useAuth } from '../contexts/AuthContext'
import type { Group, Newsletter } from '../types'

export function NewslettersPage() {
  const { token, user } = useAuth()
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupsError, setGroupsError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.memberships) {
      setGroups([])
      return
    }
    if (user.globalRole !== 'SUPER_ADMIN') {
      setGroups(user.memberships.map((m) => m.group))
    }
  }, [user?.memberships, user?.globalRole])

  useEffect(() => {
    if (!token) return
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchNewsletters(token)
        setNewsletters(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement impossible')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token])

  useEffect(() => {
    if (!token || user?.globalRole !== 'SUPER_ADMIN') return
    const loadGroups = async () => {
      try {
        const data = await fetchGroups(token)
        setGroups(data)
        setGroupsError(null)
      } catch (err) {
        setGroupsError(err instanceof Error ? err.message : "Impossible d'afficher les groupes")
      }
    }
    void loadGroups()
  }, [token, user?.globalRole])

  const active = useMemo(() => newsletters.filter((n) => n.status !== 'PUBLISHED'), [newsletters])
  const publishedCount = useMemo(() => newsletters.filter((n) => n.status === 'PUBLISHED').length, [newsletters])

  if (loading) {
    return <div className="app-shell">Chargement des newsletters…</div>
  }

  if (error) {
    return <div className="app-shell">{error}</div>
  }

  return (
    <div className="app-shell">
      <div className="section-title">
        <div>
          <div className="kicker">Dashboard</div>
          <h2 className="page-title">Newsletters accessibles</h2>
        </div>
        <Link to="/admin/newsletters" className="btn secondary">
          Créer
        </Link>
      </div>
      <div className="status-grid" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="kicker">Actives</div>
          <h3>{active.length}</h3>
          <p className="muted">Campagnes en cours de collecte ou revue.</p>
        </div>
        <div className="card">
          <div className="kicker">Archives</div>
          <h3>{publishedCount}</h3>
          <p className="muted">Disponibles pour tous les collaborateurs.</p>
        </div>
      </div>
      {groupsError && <p className="muted">Groupes: {groupsError}</p>}
      <NewsletterList items={newsletters} groups={groups} />
    </div>
  )
}
