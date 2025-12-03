interface Props {
  body: string
  onChange: (value: string) => void
}

export function CanvasEditor({ body, onChange }: Props) {
  return (
    <div className="card">
      <div className="kicker">Canvas Editor</div>
      <h3>Fignoler le texte</h3>
      <p className="muted">Modifiez directement le rendu final avant publication.</p>
      <textarea value={body} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
