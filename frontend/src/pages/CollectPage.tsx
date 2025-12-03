import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ContributionForm } from '../components/ContributionForm'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { fetchMyContributions, fetchNewsletter, submitContribution } from '../api/client'
import type { Contribution, Newsletter } from '../types'

export function CollectPage() {
  const params = useParams()
  const newsletterId = Number(params.id)
  const { token } = useAuth()
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token || Number.isNaN(newsletterId)) return
    const load = async () => {
      setLoading(true)
      try {
        const [nl, myContribs] = await Promise.all([
          fetchNewsletter(newsletterId, token),
          fetchMyContributions(newsletterId, token),
        ])
        setNewsletter(nl)
        setContributions(myContribs)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement impossible')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [newsletterId, token])

  const handleSubmit = async ({ type, title, content }: { type: Contribution['type']; title: string; content: string }) => {
    if (!token || !newsletter) {
      throw new Error('Session expirée')
    }
    setSaving(true)
    try {
      const saved = await submitContribution(newsletter.id, { type, title, content, status: 'SUBMITTED' }, token)
      setContributions((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === saved.id)
        if (existingIndex >= 0) {
          const copy = [...prev]
          copy[existingIndex] = saved
          return copy
        }
        return [...prev, saved]
      })
      return saved
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="app-shell">Chargement…</div>
  if (error) return <div className="app-shell">{error}</div>
  if (!newsletter) return <div className="app-shell">Newsletter introuvable.</div>

  return (
    <div className="app-shell">
      <div className="section-title">
        <div>
          <div className="kicker">Collecte</div>
          <h2 className="page-title">{newsletter.title}</h2>
          <p className="muted">Ajoutez vos success/fail stories pour la période {newsletter.period}.</p>
        </div>
      </div>
      <ContributionForm newsletterTitle={newsletter.title} onSubmit={handleSubmit} submitting={saving} />
      <div className="section-title">
        <h3>Vos contributions</h3>
      </div>
      <div className="grid two">
        {contributions.map((c) => (
          <div key={c.id} className="card">
            <div className="kicker">{c.type}</div>
            <h3>{c.title}</h3>
            <p className="muted">{c.content}</p>
            <StatusBadge status={c.status} kind="contribution" />
          </div>
        ))}
      </div>
    </div>
  )
}
