import type { LayoutBlock } from '../types'

interface Props {
  title: string
  period?: string
  blocks: LayoutBlock[]
  lead?: string
}

export function NewsletterPreview({ title, period, blocks, lead }: Props) {
  return (
    <div className="preview">
      <div className="kicker">Prévisualisation</div>
      <h2 style={{ marginTop: 4 }}>{title}</h2>
      {period && <p className="muted">Période {period}</p>}
      {lead && <p style={{ fontWeight: 600 }}>{lead}</p>}
      <div className="grid">
        {blocks.map((block) => (
          <section key={block.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <h3 style={{ margin: '4px 0' }}>{block.heading}</h3>
            <p>{block.body}</p>
            {block.tone && <span className="pill">Ton: {block.tone}</span>}
          </section>
        ))}
      </div>
    </div>
  )
}
