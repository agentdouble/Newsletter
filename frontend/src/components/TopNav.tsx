import { NavLink } from 'react-router-dom'

interface TopNavProps {
  userName: string
  onLogout?: () => void
}

export function TopNav({ userName, onLogout }: TopNavProps) {
  const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')

  return (
    <nav className="topbar">
      <div className="logo">
        <span className="pill dark">NL</span>
        <div>
          <div className="kicker">Newsletter</div>
          <div>{userName}</div>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="nav-links">
          <NavLink to="/newsletters" className={navClass}>
            Newsletters
          </NavLink>
          <NavLink to="/newsletters/archive" className={navClass}>
            Archives
          </NavLink>
          <NavLink to="/admin/groups" className={navClass}>
            Groupes
          </NavLink>
          <NavLink to="/admin/newsletters" className={navClass}>
            Admin NL
          </NavLink>
          <NavLink to="/newsletters/1/edit" className={navClass}>
            Canvas
          </NavLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="pill muted">{userName}</span>
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
