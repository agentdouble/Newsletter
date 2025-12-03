import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Group } from '../types'

interface Props {
  groups: Group[]
  onCreate: (payload: { name: string; description: string }) => Promise<void> | void
  creating?: boolean
  error?: string | null
}

export function AdminGroupManager({ groups, onCreate, creating = false, error }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    try {
      await onCreate({ name, description })
      setName('')
      setDescription('')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Création impossible')
    }
  }

  return (
    <div className="grid two">
      <div className="card">
        <div className="kicker">Groupes</div>
        <h3>Groupes actuels</h3>
        {error && <p className="muted">{error}</p>}
        <div className="table-like">
          {groups.map((group) => (
            <div key={group.id} className="row">
              <div>
                <strong>{group.name}</strong>
              </div>
              <div className="muted">{group.description}</div>
              <div style={{ textAlign: 'right' }}>
                <span className="pill">Membres: à brancher</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="kicker">Nouvelle équipe</div>
        <h3>Ajouter un groupe</h3>
        <form onSubmit={handleAdd} className="form-row">
          <label>
            Nom
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Description
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button className="btn" type="submit" style={{ marginTop: 8 }} disabled={creating}>
            {creating ? 'Création…' : 'Créer le groupe'}
          </button>
          {localError && <p className="muted">{localError}</p>}
        </form>
      </div>
    </div>
  )
}
