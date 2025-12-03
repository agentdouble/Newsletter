import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoginForm() {
  const navigate = useNavigate()
  const { login, loading, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (error) setMessage(error)
  }, [error])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    try {
      await login(email, password)
      navigate('/newsletter')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Connexion impossible')
    }
  }

  const handleChangeEmail = (value: string) => {
    setEmail(value)
    if (message) {
      clearError()
      setMessage('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="kicker">Connexion</div>
      <h2 style={{ marginTop: 0 }}>Se connecter</h2>
      <div className="form-row">
        <label>
          Email
          <input className="input" type="email" value={email} onChange={(e) => handleChangeEmail(e.target.value)} required />
        </label>
      </div>
      <div className="form-row" style={{ marginTop: 12 }}>
        <label>
          Mot de passe
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
      </div>
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Connexion…' : 'Entrer'}
        </button>
        <span className="muted">Accès réservé aux membres des groupes.</span>
      </div>
      {message && <p className="muted" style={{ marginTop: 12 }}>{message}</p>}
    </form>
  )
}
