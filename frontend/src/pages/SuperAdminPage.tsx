import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { addNewsletterAdmin, createGroup, createUser, fetchGroups, fetchNewsletterAdmins, fetchNewsletters, fetchUsers, removeNewsletterAdmin } from '../api/client'
import { AdminGroupManager } from '../components/AdminGroupManager'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import type { GlobalRole, Group, Newsletter, NewsletterAdmin, User } from '../types'

export function SuperAdminPage() {
  const { token, user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [newsletters, setNewsletters] = useState<Newsletter[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [admins, setAdmins] = useState<NewsletterAdmin[]>([])
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [userFormError, setUserFormError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'admins' | 'groups'>('users')
  const [userForm, setUserForm] = useState<{
    name: string
    email: string
    trigram: string
    password: string
    globalRole: GlobalRole
  }>({ name: '', email: '', trigram: '', password: '', globalRole: 'USER' })

  useEffect(() => {
    if (!token) return
    if (user?.globalRole !== 'SUPER_ADMIN') {
      setError('Accès réservé aux super administrateurs.')
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const [usersData, newslettersData, groupsData] = await Promise.all([
          fetchUsers(token),
          fetchNewsletters(token),
          fetchGroups(token),
        ])
        setUsers(usersData)
        setNewsletters(newslettersData)
        setGroups(groupsData)
        setError(null)
        if (newslettersData.length) {
          setSelectedNewsletterId((prev) => prev ?? newslettersData[0]!.id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement impossible')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token, user?.globalRole])

  useEffect(() => {
    if (users.length && selectedUserId === null) {
      setSelectedUserId(users[0]!.id)
    }
  }, [users, selectedUserId])

  useEffect(() => {
    if (!token || user?.globalRole !== 'SUPER_ADMIN' || !selectedNewsletterId) return
    const loadAdmins = async () => {
      setAdminLoading(true)
      try {
        const data = await fetchNewsletterAdmins(selectedNewsletterId, token)
        setAdmins(data)
        setAdminError(null)
      } catch (err) {
        setAdminError(err instanceof Error ? err.message : 'Chargement des admins impossible')
      } finally {
        setAdminLoading(false)
      }
    }
    void loadAdmins()
  }, [selectedNewsletterId, token, user?.globalRole])

  const selectedNewsletter = useMemo(
    () => newsletters.find((nl) => nl.id === selectedNewsletterId) ?? null,
    [newsletters, selectedNewsletterId],
  )

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    setCreatingUser(true)
    setUserFormError(null)
    try {
      const created = await createUser(userForm, token)
      setUsers((prev) => [...prev, created])
      setUserForm({ name: '', email: '', trigram: '', password: '', globalRole: 'USER' })
      setSelectedUserId((prev) => prev ?? created.id)
    } catch (err) {
      setUserFormError(err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleCreateGroup = async ({ name, description }: { name: string; description: string }) => {
    if (!token) return
    setCreatingGroup(true)
    try {
      const group = await createGroup({ name, description }, token)
      setGroups((prev) => [...prev, group])
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!token || !selectedNewsletterId || !selectedUserId) return
    setAdminError(null)
    setAdminLoading(true)
    try {
      const link = await addNewsletterAdmin(selectedNewsletterId, selectedUserId, token)
      setAdmins((prev) => [...prev, link])
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Ajout impossible')
    } finally {
      setAdminLoading(false)
    }
  }

  const handleRemoveAdmin = async (userId: number) => {
    if (!token || !selectedNewsletterId) return
    setAdminError(null)
    setAdminLoading(true)
    try {
      await removeNewsletterAdmin(selectedNewsletterId, userId, token)
      setAdmins((prev) => prev.filter((a) => a.userId !== userId))
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setAdminLoading(false)
    }
  }

  if (loading) return <div className="app-shell">Chargement du centre super admin…</div>
  if (error) return <div className="app-shell">{error}</div>

  return (
    <div className="app-shell">
      <div className="section-title">
        <div>
          <div className="kicker">Super admin</div>
          <h2 className="page-title">Pilotage central</h2>
          <p className="muted">Créez des comptes, assignez des admins par newsletter et structurez les groupes.</p>
        </div>
      </div>
      <div className="tab-bar">
        <button
          type="button"
          className={activeTab === 'users' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('users')}
        >
          Utilisateurs
        </button>
        <button
          type="button"
          className={activeTab === 'admins' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('admins')}
        >
          Admins NL
        </button>
        <button
          type="button"
          className={activeTab === 'groups' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('groups')}
        >
          Groupes
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="card">
          <div className="kicker">Utilisateurs</div>
          <h3>Création</h3>
          <form className="form-row" onSubmit={handleCreateUser}>
            <label>
              Nom
              <input className="input" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
            </label>
            <label>
              Email
              <input className="input" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
            </label>
            <label>
              Trigramme
              <input className="input" value={userForm.trigram} onChange={(e) => setUserForm({ ...userForm, trigram: e.target.value })} required />
            </label>
            <div className="form-row inline">
              <label>
                Mot de passe
                <input className="input" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
              </label>
              <label>
                Rôle global
                <select value={userForm.globalRole} onChange={(e) => setUserForm({ ...userForm, globalRole: e.target.value as GlobalRole })}>
                  <option value="USER">Utilisateur</option>
                  <option value="ADMIN">Admin de groupe</option>
                  <option value="SUPER_ADMIN">Super admin</option>
                </select>
              </label>
            </div>
            <button className="btn" type="submit" disabled={creatingUser}>
              {creatingUser ? 'Création…' : 'Créer le compte'}
            </button>
            {userFormError && <p className="muted">{userFormError}</p>}
          </form>
          <div className="table-like" style={{ marginTop: 14 }}>
            {users.map((u) => (
              <div key={u.id} className="row">
                <div>
                  <strong>{u.name}</strong>
                  <div className="muted">{u.email}</div>
                </div>
                <div className="muted">{u.trigram}</div>
                <div style={{ textAlign: 'right' }}>
                  <span className="pill">{u.globalRole}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'admins' && (
        <div className="card">
          <div className="kicker">Admins par newsletter</div>
          <h3>Assigner</h3>
          {newsletters.length === 0 ? (
            <p className="muted">Créez d&apos;abord une newsletter pour pouvoir assigner des admins.</p>
          ) : (
            <>
              <label>
                Newsletter
                <select value={selectedNewsletterId ?? ''} onChange={(e) => setSelectedNewsletterId(Number(e.target.value))}>
                  {newsletters.map((nl) => (
                    <option key={nl.id} value={nl.id}>
                      {nl.title} ({nl.period || 'période ?'})
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-row inline">
                <label>
                  Utilisateur
                  <select value={selectedUserId ?? ''} onChange={(e) => setSelectedUserId(Number(e.target.value))}>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.globalRole})
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn" type="button" onClick={handleAddAdmin} disabled={adminLoading || !selectedUserId}>
                  {adminLoading ? 'En cours…' : 'Ajouter'}
                </button>
              </div>
              {adminError && <p className="muted">{adminError}</p>}
              <div className="table-like" style={{ marginTop: 12 }}>
                {adminLoading && admins.length === 0 && <p className="muted">Chargement…</p>}
                {admins.map((adm) => (
                  <div key={adm.id} className="row">
                    <div>
                      <strong>{adm.user?.name ?? `User #${adm.userId}`}</strong>
                      <div className="muted">{adm.user?.email}</div>
                    </div>
                    <div className="muted">{selectedNewsletter?.title}</div>
                    <div style={{ textAlign: 'right' }}>
                      <StatusBadge status={selectedNewsletter?.status ?? 'DRAFT'} kind="newsletter" />
                      <button className="btn secondary" type="button" onClick={() => handleRemoveAdmin(adm.userId)} style={{ marginLeft: 8 }} disabled={adminLoading}>
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <div>
          <div className="section-title">
            <div>
              <div className="kicker">Groupes</div>
              <h3 className="page-title">Organisation</h3>
            </div>
          </div>
          <AdminGroupManager groups={groups} onCreate={handleCreateGroup} creating={creatingGroup} />
        </div>
      )}
    </div>
  )
}
