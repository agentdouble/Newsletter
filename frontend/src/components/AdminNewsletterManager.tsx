import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Group, Newsletter, NewsletterStatus } from '../types'
import { StatusBadge } from './StatusBadge'

interface Props {
  newsletters: Newsletter[]
  groups: Group[]
  creating?: boolean
  onCreate: (payload: { title: string; period: string; status: NewsletterStatus; groupId: number }) => Promise<void>
}

const statuses: NewsletterStatus[] = ['DRAFT', 'COLLECTING', 'REVIEW', 'APPROVED', 'PUBLISHED']

export function AdminNewsletterManager({ newsletters, groups, creating = false, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [period, setPeriod] = useState('')
  const [status, setStatus] = useState<NewsletterStatus>('DRAFT')
  const [groupId, setGroupId] = useState<number>(groups[0]?.id ?? 0)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (groups.length && !groups.find((g) => g.id === groupId)) {
      setGroupId(groups[0]!.id)
    }
  }, [groups, groupId])

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    try {
      await onCreate({ title, period, status, groupId })
      setTitle('')
      setPeriod('')
      setStatus('DRAFT')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Création impossible')
    }
  }

  return (
    <div className="grid two">
      <div className="card">
        <div className="kicker">Campagnes</div>
        <h3>Newsletters</h3>
        <div className="table-like">
          {newsletters.map((nl) => (
            <div key={nl.id} className="row">
              <div>
                <strong>{nl.title}</strong>
                <div className="muted">{nl.period || 'Période à définir'}</div>
              </div>
              <div className="muted">{groups.find((g) => g.id === nl.groupId)?.name}</div>
              <div style={{ textAlign: 'right' }}>
                <StatusBadge status={nl.status} kind="newsletter" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="kicker">Nouvelle newsletter</div>
        <h3>Créer</h3>
        <form onSubmit={handleCreate} className="form-row">
          <label>
            Titre
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <div className="form-row inline">
            <label>
              Période (AAAA-MM)
              <input className="input" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2025-06" />
            </label>
            <label>
              Statut
              <select value={status} onChange={(e) => setStatus(e.target.value as NewsletterStatus)}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Groupe
            <select value={groupId} onChange={(e) => setGroupId(Number(e.target.value))} disabled={!groups.length}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" type="submit" style={{ marginTop: 10 }} disabled={creating || !groups.length}>
            {creating ? 'Création…' : 'Créer la campagne'}
          </button>
          {localError && <p className="muted">{localError}</p>}
        </form>
      </div>
    </div>
  )
}
