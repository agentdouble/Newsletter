import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { fetchContributions, fetchNewsletter, updateContributionStatus } from '../api/client'
import type { Contribution, ContributionStatus, Newsletter } from '../types'

export function NewsletterAdminPage() {
  const params = useParams()
  const newsletterId = Number(params.id)
  const { token } = useAuth()
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    if (!token || Number.isNaN(newsletterId)) return
    const load = async () => {
      setLoading(true)
      try {
        const [nl, contribs] = await Promise.all([
          fetchNewsletter(newsletterId, token),
          fetchContributions(newsletterId, token),
        ])
        setNewsletter(nl)
        setContributions(contribs)
        setLoadError(null)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Chargement impossible')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [newsletterId, token])

  const handleStatus = async (id: number, status: ContributionStatus) => {
    if (!token) return
    setUpdatingId(id)
    try {
      setActionError(null)
      const updated = await updateContributionStatus(id, status, token)
      setContributions((prev) => prev.map((c) => (c.id === id ? updated : c)))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <div className="app-shell">Chargement…</div>
  if (loadError) return <div className="app-shell">{loadError}</div>
  if (!newsletter) return <div className="app-shell">Newsletter introuvable.</div>

  return (
    <div className="app-shell">
      <div className="section-title">
        <div>
          <div className="kicker">Admin</div>
          <h2 className="page-title">{newsletter.title}</h2>
          <p className="muted">Validez les contributions avant génération IA.</p>
        </div>
      </div>
      {actionError && <p className="muted">{actionError}</p>}
      <div className="grid two">
        {contributions.map((c) => (
          <div key={c.id} className="card">
            <div className="kicker">{c.type}</div>
            <h3>{c.title}</h3>
            <p className="muted">{c.content}</p>
            <div className="badge-stack">
              <StatusBadge status={c.status} kind="contribution" />
              <button className="btn secondary" type="button" onClick={() => handleStatus(c.id, 'APPROVED')} disabled={updatingId === c.id}>
                {updatingId === c.id ? 'Maj…' : 'Approuver'}
              </button>
              <button className="btn secondary" type="button" onClick={() => handleStatus(c.id, 'REJECTED')} disabled={updatingId === c.id}>
                Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
