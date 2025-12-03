import { useState } from 'react'
import { generateAiDraft } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  newsletterId: number
  currentTitle: string
  onDraft: (layout: any) => void
}

export function AiDraftControls({ newsletterId, onDraft, currentTitle }: Props) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleDraft = async () => {
    if (!token) {
      setError('Session expirée')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const newsletter = await generateAiDraft(newsletterId, token)
      onDraft(newsletter.layoutConfig)
      const layoutNote = newsletter.layoutConfig?.note
      const aiSummary = newsletter.layoutConfig?.ai_summary
      setNote(layoutNote || (aiSummary ? 'Brouillon IA généré.' : 'Brouillon généré via backend.'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Génération impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="kicker">IA Draft</div>
      <h3>Brouillon automatique</h3>
      <p className="muted">Titre actuel : {currentTitle}</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn" onClick={handleDraft} disabled={loading}>
          {loading ? 'Génération…' : 'Générer avec l’IA'}
        </button>
        <span className="pill">Appel API OpenAI encapsulé côté backend</span>
      </div>
      {error && <p className="muted" style={{ marginTop: 10 }}>{error}</p>}
      {note && <p className="muted" style={{ marginTop: 10 }}>{note}</p>}
    </div>
  )
}
