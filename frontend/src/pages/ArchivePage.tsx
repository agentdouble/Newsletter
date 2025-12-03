import { useEffect, useState } from 'react'
import { fetchNewsletters } from '../api/client'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import type { Newsletter } from '../types'

export function ArchivePage() {
  const { token } = useAuth()
  const [published, setPublished] = useState<Newsletter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchNewsletters(token, { status: 'PUBLISHED' })
        setPublished(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger les archives')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token])

  if (loading) return <div className="app-shell">Chargement des archives…</div>
  if (error) return <div className="app-shell">{error}</div>
  return (
    <div className="app-shell">
      <div className="section-title">
        <div>
          <div className="kicker">Archives</div>
          <h2 className="page-title">Newsletters publiées</h2>
        </div>
      </div>
      <div className="grid two">
        {published.map((nl) => (
          <div key={nl.id} className="card">
            <div className="kicker">Archive</div>
            <h3>{nl.title}</h3>
            <p className="muted">{nl.period}</p>
            <StatusBadge status={nl.status} kind="newsletter" />
            <div className="canvas" style={{ marginTop: 10 }}>
              {nl.renderedHtml ? (
                <div dangerouslySetInnerHTML={{ __html: nl.renderedHtml }} />
              ) : (
                <p className="muted">Aperçu non généré (champ rendered_html côté API).</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
