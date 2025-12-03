import { useEffect, useState } from 'react'
import { AdminNewsletterManager } from '../components/AdminNewsletterManager'
import { useAuth } from '../contexts/AuthContext'
import { createNewsletter, fetchGroups, fetchNewsletters } from '../api/client'
import type { Group, Newsletter } from '../types'

export function AdminNewslettersPage() {
  const { token, user } = useAuth()
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupsError, setGroupsError] = useState<string | null>(null)

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
    if (!user?.memberships || user.globalRole === 'SUPER_ADMIN') return
    setGroups(user.memberships.map((m) => m.group))
  }, [user?.memberships, user?.globalRole])

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

  const handleCreate = async ({ title, period, status, groupId }: { title: string; period: string; status: Newsletter['status']; groupId: number }) => {
    if (!token) throw new Error('Session expirée')
    setCreating(true)
    try {
      const created = await createNewsletter({ title, period, status, groupId }, token)
      setNewsletters((prev) => [created, ...prev])
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="app-shell">Chargement des newsletters…</div>
  if (error) return <div className="app-shell">{error}</div>

  return (
    <div className="app-shell">
      <div className="section-title">
        <div>
          <div className="kicker">Administration</div>
          <h2 className="page-title">Newsletters</h2>
          <p className="muted">Planifiez les campagnes, assignez-les aux groupes, pilotez le statut.</p>
        </div>
      </div>
      {groupsError && <p className="muted">Groupes: {groupsError}</p>}
      <AdminNewsletterManager
        newsletters={newsletters}
        groups={groups}
        creating={creating}
        onCreate={handleCreate}
      />
    </div>
  )
}
