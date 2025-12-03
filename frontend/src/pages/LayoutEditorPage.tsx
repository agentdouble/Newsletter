import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AiDraftControls } from '../components/AiDraftControls'
import { CanvasEditor } from '../components/CanvasEditor'
import { LayoutEditor } from '../components/LayoutEditor'
import { NewsletterPreview } from '../components/NewsletterPreview'
import { useAuth } from '../contexts/AuthContext'
import { fetchContributions, fetchNewsletter, renderNewsletter, updateNewsletterLayout } from '../api/client'
import type { Contribution, LayoutBlock, Newsletter } from '../types'

function extractLead(layoutConfig?: any): string {
  if (!layoutConfig) return ''
  return layoutConfig.lead || layoutConfig.ai_summary || layoutConfig.note || ''
}

const DEFAULT_LEAD = "Intro courte : rappeler l’objectif de la newsletter et remercier les contributeurs."

function extractBlocks(layoutConfig: any, contributions: Contribution[]): LayoutBlock[] {
  if (layoutConfig?.blocks && Array.isArray(layoutConfig.blocks)) {
    return layoutConfig.blocks.map((block: any, index: number) => ({
      id: block.id ?? `block-${index}`,
      heading: block.heading ?? `Bloc ${index + 1}`,
      body: block.body ?? '',
      tone: block.tone,
    }))
  }

  if (layoutConfig?.sections && Array.isArray(layoutConfig.sections)) {
    return layoutConfig.sections.map((section: any, index: number) => ({
      id: section.id ?? `section-${index}`,
      heading: section.heading ?? section.title ?? `Section ${index + 1}`,
      body: (section.items || [])
        .map((item: any) => `${item.title ? `${item.title}: ` : ''}${item.content ?? ''}`.trim())
        .filter(Boolean)
        .join('\n'),
    }))
  }

  const approved = contributions.filter((c) => c.status === 'APPROVED')
  return approved.map((c) => ({
    id: `${c.id}`,
    heading: `${c.type} — ${c.title}`,
    body: c.content,
  }))
}

export function LayoutEditorPage() {
  const params = useParams()
  const newsletterId = Number(params.id)
  const { token } = useAuth()
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [blocks, setBlocks] = useState<LayoutBlock[]>([])
  const [canvas, setCanvas] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [rendering, setRendering] = useState(false)

  useEffect(() => {
    if (!token || Number.isNaN(newsletterId)) return
    const load = async () => {
      setLoading(true)
      try {
        const [nl, contribs] = await Promise.all([
          fetchNewsletter(newsletterId, token),
          fetchContributions(newsletterId, token),
        ])
        setNewsletter(nl)
        setContributions(contribs)
        setBlocks(extractBlocks(nl.layoutConfig, contribs))
        const lead = extractLead(nl.layoutConfig)
        setCanvas(lead || DEFAULT_LEAD)
        setLoadError(null)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Chargement impossible')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [newsletterId, token])

  const handleDraft = (layoutConfig: any) => {
    setActionError(null)
    setBlocks(extractBlocks(layoutConfig, contributions))
    const lead = extractLead(layoutConfig)
    setCanvas(lead || DEFAULT_LEAD)
    setNewsletter((prev) => (prev ? { ...prev, layoutConfig } : prev))
  }

  const handleSaveLayout = async () => {
    if (!token || !newsletter) return
    setSaving(true)
    setMessage(null)
    try {
      const updated = await updateNewsletterLayout(newsletter.id, { blocks, lead: canvas }, token)
      setNewsletter(updated)
      setMessage('Layout enregistré sur le backend.')
      setActionError(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Sauvegarde impossible')
    } finally {
      setSaving(false)
    }
  }

  const handleRender = async () => {
    if (!token || !newsletter) return
    setRendering(true)
    setMessage(null)
    try {
      const updated = await renderNewsletter(newsletter.id, token)
      setNewsletter(updated)
      setMessage('Rendu HTML mis à jour depuis les contributions approuvées.')
      setActionError(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Rendu impossible')
    } finally {
      setRendering(false)
    }
  }

  if (loading) return <div className="app-shell">Chargement…</div>
  if (loadError) return <div className="app-shell">{loadError}</div>
  if (!newsletter) return <div className="app-shell">Newsletter introuvable.</div>

  return (
    <div className="app-shell">
      <div className="section-title">
        <div>
          <div className="kicker">Canvas</div>
          <h2 className="page-title">{newsletter.title}</h2>
          <p className="muted">Ordonnez les sections, générez un brouillon IA, et prévisualisez le rendu.</p>
        </div>
      </div>
      {actionError && <p className="muted">{actionError}</p>}
      {message && <p className="pill">{message}</p>}
      <div className="grid two">
        <AiDraftControls newsletterId={newsletter.id} onDraft={handleDraft} currentTitle={newsletter.title} />
        <CanvasEditor body={canvas} onChange={setCanvas} />
      </div>
      <div className="grid two" style={{ marginTop: 16 }}>
        <LayoutEditor blocks={blocks} onChange={setBlocks} />
        <NewsletterPreview title={newsletter.title} period={newsletter.period ?? undefined} blocks={blocks} lead={canvas} />
      </div>
      <div className="section-title" style={{ marginTop: 12 }}>
        <div />
        <div className="badge-stack">
          <button className="btn secondary" type="button" onClick={handleRender} disabled={rendering}>
            {rendering ? 'Mise à jour…' : 'Rafraîchir le rendu HTML'}
          </button>
          <button className="btn" type="button" onClick={handleSaveLayout} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer le layout'}
          </button>
        </div>
      </div>
      {newsletter.renderedHtml && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="kicker">Rendered HTML</div>
          <div dangerouslySetInnerHTML={{ __html: newsletter.renderedHtml }} />
        </div>
      )}
    </div>
  )
}
