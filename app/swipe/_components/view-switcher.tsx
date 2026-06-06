'use client'

export type ViewMode = 'swipe' | 'risk-matrix' | 'contributor' | 'category' | 'deps'

interface Props {
  current: ViewMode
  onChange: (v: ViewMode) => void
}

const VIEWS: { id: ViewMode; label: string; title: string }[] = [
  { id: 'swipe',       label: '⇄',  title: 'Swipe' },
  { id: 'risk-matrix', label: '▦',  title: 'Risk Matrix' },
  { id: 'contributor', label: '◉',  title: 'By Contributor' },
  { id: 'category',    label: '⊞',  title: 'By Category' },
  { id: 'deps',        label: '⋮',  title: 'Dependencies' },
]

export function ViewSwitcher({ current, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-0.5">
      {VIEWS.map(({ id, label, title }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={title}
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors ${
            current === id
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
