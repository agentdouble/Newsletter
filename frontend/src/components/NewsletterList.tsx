import { Link } from 'react-router-dom'
import type { Group, Newsletter } from '../types'
import { StatusBadge } from './StatusBadge'

interface NewsletterListProps {
  items: Newsletter[]
  groups: Group[]
  showActions?: boolean
}

export function NewsletterList({ items, groups, showActions = true }: NewsletterListProps) {
  const groupName = (groupId: number) => groups.find((g) => g.id === groupId)?.name ?? 'Groupe inconnu'

  return (
    <div className="grid two">
      {items.map((nl) => (
        <div className="card" key={nl.id}>
          <div className="kicker">{groupName(nl.groupId)}</div>
          <h3>{nl.title}</h3>
          <p className="muted">Période: {nl.period || 'non définie'}</p>
          <div className="badge-stack" style={{ marginBottom: 10 }}>
            <StatusBadge status={nl.status} kind="newsletter" />
            {nl.renderedHtml && <span className="pill">Aperçu prêt</span>}
          </div>
          {showActions && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to={`/newsletters/${nl.id}/collect`} className="btn secondary">
                Contribuer
              </Link>
              <Link to={`/newsletters/${nl.id}/admin`} className="btn secondary">
                Admin
              </Link>
              <Link to={`/newsletters/${nl.id}/edit`} className="btn">
                Canvas
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
