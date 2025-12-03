import { NavLink } from 'react-router-dom'
import type { User } from '../types'

interface TopNavProps {
  user?: User | null
  onLogout?: () => void
}

export function TopNav({ user, onLogout }: TopNavProps) {
  const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')
  const displayName = user?.name ?? 'Utilisateur'
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN'
  const isGroupAdmin = user?.memberships?.some((m) => (m.roleInGroup || '').toLowerCase() === 'admin')

  return (
    <nav className="topbar">
      <div className="logo">
        <span className="pill dark">NL</span>
        <div>
          <div className="kicker">Newsletter</div>
          <div>{displayName}</div>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="nav-links">
          <NavLink to="/newsletter" className={navClass}>
            Newsletters
          </NavLink>
          <NavLink to="/newsletters/archive" className={navClass}>
            Archives
          </NavLink>
          {(isSuperAdmin || isGroupAdmin) && (
            <NavLink to="/admin/newsletters" className={navClass}>
              Admin NL
            </NavLink>
          )}
          {isSuperAdmin && (
            <>
              <NavLink to="/admin/super" className={navClass}>
                Super admin
              </NavLink>
              <NavLink to="/admin/groups" className={navClass}>
                Groupes
              </NavLink>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="pill muted">{displayName}</span>
          {onLogout && (
            <button className="btn secondary" type="button" onClick={onLogout}>
              Déconnexion
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
