import type { LayoutBlock } from '../types'

interface Props {
  blocks: LayoutBlock[]
  onChange: (blocks: LayoutBlock[]) => void
}

export function LayoutEditor({ blocks, onChange }: Props) {
  const updateBlock = (id: string, field: 'heading' | 'body', value: string) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)))
  }

  const moveBlock = (id: string, direction: number) => {
    const index = blocks.findIndex((b) => b.id === id)
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    const reordered = [...blocks]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    onChange(reordered)
  }

  const addBlock = () => {
    const newBlock: LayoutBlock = {
      id: `${Date.now()}`,
      heading: 'Nouveau bloc',
      body: 'Ajoutez votre texte ici (drag & drop simple).',
    }
    onChange([...blocks, newBlock])
  }

  const deleteBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id))
  }

  return (
    <div className="card">
      <div className="kicker">Layout Editor</div>
      <h3>Sections</h3>
      <div className="grid">
        {blocks.map((block, index) => (
          <div key={block.id} className="card" style={{ borderStyle: 'dashed', boxShadow: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <input
                className="input"
                value={block.heading}
                onChange={(e) => updateBlock(block.id, 'heading', e.target.value)}
              />
              <div className="badge-stack">
                <button className="btn secondary" type="button" onClick={() => moveBlock(block.id, -1)}>
                  ↑
                </button>
                <button className="btn secondary" type="button" onClick={() => moveBlock(block.id, 1)}>
                  ↓
                </button>
                <button className="btn secondary" type="button" onClick={() => deleteBlock(block.id)}>
                  ✕
                </button>
              </div>
            </div>
            <textarea value={block.body} onChange={(e) => updateBlock(block.id, 'body', e.target.value)} />
            <div className="muted">Bloc {index + 1}</div>
          </div>
        ))}
      </div>
      <button className="btn secondary" style={{ marginTop: 12 }} type="button" onClick={addBlock}>
        Ajouter un bloc
      </button>
    </div>
  )
}
