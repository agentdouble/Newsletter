import { useEffect, useState } from 'react'
import { AdminGroupManager } from '../components/AdminGroupManager'
import { useAuth } from '../contexts/AuthContext'
import { createGroup, fetchGroups } from '../api/client'
import type { Group } from '../types'

export function AdminGroupsPage() {
  const { token, user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!token) return
    if (user?.globalRole !== 'SUPER_ADMIN') {
      setError('Accès réservé aux super administrateurs')
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchGroups(token)
        setGroups(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement impossible')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token, user?.globalRole])

  const handleCreate = async ({ name, description }: { name: string; description: string }) => {
    if (!token) return
    setCreating(true)
    try {
      const group = await createGroup({ name, description }, token)
      setGroups((prev) => [...prev, group])
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="app-shell">Chargement des groupes…</div>
  if (error) return <div className="app-shell">{error}</div>

  return (
    <div className="app-shell">
      <div className="section-title">
        <div>
          <div className="kicker">Administration</div>
          <h2 className="page-title">Groupes & membres</h2>
        </div>
      </div>
      <AdminGroupManager groups={groups} onCreate={handleCreate} creating={creating} />
    </div>
  )
}
