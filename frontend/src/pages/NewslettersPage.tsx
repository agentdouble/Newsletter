import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchGroups, fetchNewsletters } from '../api/client'
import { NewsletterList } from '../components/NewsletterList'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import type { Group, Newsletter } from '../types'

export function NewslettersPage() {
  const { token, user } = useAuth()
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'feed' | 'collab'>('feed')

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
  const collaborationList = useMemo(
    () => newsletters.filter((n) => n.status === 'COLLECTING' || n.status === 'REVIEW'),
    [newsletters],
  )
  const publishedCount = useMemo(() => newsletters.filter((n) => n.status === 'PUBLISHED').length, [newsletters])
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN'
  const canCreateCampaigns =
    isSuperAdmin || user?.memberships?.some((m) => (m.roleInGroup || '').toLowerCase() === 'admin')

  const groupName = (groupId: number) => groups.find((g) => g.id === groupId)?.name ?? 'Groupe inconnu'

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
        {canCreateCampaigns && (
          <Link to="/admin/newsletters" className="btn secondary">
            Créer
          </Link>
        )}
      </div>
      <div className="tab-bar">
        <button className={activeTab === 'feed' ? 'tab active' : 'tab'} type="button" onClick={() => setActiveTab('feed')}>
          Fil
        </button>
        <button
          className={activeTab === 'collab' ? 'tab active' : 'tab'}
          type="button"
          onClick={() => setActiveTab('collab')}
        >
          Collaboration
        </button>
      </div>
      {activeTab === 'feed' ? (
        <>
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
        </>
      ) : (
        <div className="grid two">
          {collaborationList.length === 0 && (
            <div className="card">
              <div className="kicker">Collaboration</div>
              <h3>Rien à coordonner</h3>
              <p className="muted">Aucune newsletter n&apos;est ouverte. Surveillez ce fil pour collaborer dès la prochaine campagne.</p>
            </div>
          )}
          {collaborationList.map((nl) => (
            <div key={nl.id} className="card">
              <div className="kicker">{groupName(nl.groupId)}</div>
              <h3>{nl.title}</h3>
              <p className="muted">Période: {nl.period || 'non définie'} — collaboration en cours.</p>
              <div className="badge-stack" style={{ marginBottom: 12 }}>
                <StatusBadge status={nl.status} kind="newsletter" />
                <span className="pill">Ouvert aux contributions</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to={`/newsletters/${nl.id}/collect`} className="btn">
                  Collaborer
                </Link>
                <Link to={`/newsletters/${nl.id}/admin`} className="btn secondary">
                  Suivi admin
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
