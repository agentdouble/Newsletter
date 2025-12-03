import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Contribution, ContributionType } from '../types'
import { StatusBadge } from './StatusBadge'

interface ContributionFormProps {
  newsletterTitle: string
  submitting?: boolean
  error?: string | null
  onSubmit: (payload: { type: ContributionType; title: string; content: string }) => Promise<Contribution>
}

const types: ContributionType[] = ['SUCCESS', 'FAIL', 'INFO', 'OTHER']

export function ContributionForm({ newsletterTitle, submitting = false, error, onSubmit }: ContributionFormProps) {
  const [type, setType] = useState<ContributionType>('SUCCESS')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [lastStatus, setLastStatus] = useState<Contribution['status'] | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    try {
      const result = await onSubmit({ type, title, content })
      setLastStatus(result.status)
      setTitle('')
      setContent('')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Envoi impossible')
    }
  }

  return (
    <div className="card">
      <div className="kicker">Contribution</div>
      <h3>Ajouter une histoire pour « {newsletterTitle} »</h3>
      <form onSubmit={handleSubmit} className="form-row" style={{ gap: 12 }}>
        <div className="form-row inline">
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value as ContributionType)}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Titre
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
        </div>
        <label>
          Contenu
          <textarea value={content} onChange={(e) => setContent(e.target.value)} required placeholder="Ce qui s'est bien passé, les chiffres clés, les prochaines étapes..." />
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Envoi…' : 'Soumettre'}
          </button>
          {lastStatus && <StatusBadge status={lastStatus} kind="contribution" />}
        </div>
        {(error || localError) && <p className="muted">{error ?? localError}</p>}
      </form>
    </div>
  )
}
