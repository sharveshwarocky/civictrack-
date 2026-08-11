/** Segmented Sign in / Sign up switcher used by both the citizen and org portals. */
export function AuthTabs({
  mode,
  onChange,
  signUpLabel = 'Sign up',
  accent = 'green',
}: {
  mode: 'signin' | 'signup'
  onChange: (m: 'signin' | 'signup') => void
  signUpLabel?: string
  accent?: 'green' | 'blue'
}) {
  const tabs: { key: 'signin' | 'signup'; label: string }[] = [
    { key: 'signin', label: 'Sign in' },
    { key: 'signup', label: signUpLabel },
  ]
  const active =
    accent === 'green'
      ? 'bg-green text-bg shadow-[0_2px_12px_rgba(0,200,83,0.35)]'
      : 'bg-[#2979FF] text-white shadow-[0_2px_12px_rgba(41,121,255,0.35)]'
  return (
    <div role="tablist" aria-label="Authentication mode" className="flex gap-1 rounded-full border border-line bg-surface p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={mode === t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 rounded-full px-4 py-2 text-[13px] font-semibold transition-all btn-press ${
            mode === t.key ? active : 'text-muted hover:text-ink'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
