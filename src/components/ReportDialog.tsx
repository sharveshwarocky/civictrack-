import { useState } from 'react'
import { Check, Flag } from 'lucide-react'

const REASONS = ['Spam', 'Abusive content', 'Misleading information', 'Off-topic', 'Harassment', 'Other']

/** Citizen report dialog — pick a reason, content goes to the admin moderation queue. */
export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  onReport,
}: {
  open: boolean
  onClose: () => void
  targetType: 'issue' | 'comment'
  targetId: string
  onReport: (targetType: 'issue' | 'comment', targetId: string, reason: string) => Promise<string | null>
}) {
  const [reason, setReason] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!open) return null

  const submit = async () => {
    if (!reason || busy) return
    setBusy(true)
    setMsg(null)
    const err = await onReport(targetType, targetId, reason)
    setBusy(false)
    if (err) {
      setMsg(err)
      return
    }
    setMsg('Reported. An admin will review it shortly. 🙏')
    window.setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[380px] rounded-2xl border border-line bg-surface p-5 shadow-float">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red/15 text-red">
            <Flag size={16} />
          </span>
          <div>
            <h3 className="text-[15px] font-bold">Report this {targetType}</h3>
            <p className="text-[11px] text-muted">5+ reports auto-hide it until an admin decides.</p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold transition-all ${
                reason === r ? 'border-red/40 bg-red/10 text-red' : 'border-line bg-bg/50 text-ink hover:border-red/20'
              }`}
            >
              {r}
              {reason === r && <Check size={15} />}
            </button>
          ))}
        </div>

        {msg && <p className="mt-3 text-center text-[11.5px] font-medium text-ink/80">{msg}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line bg-bg/50 py-2.5 text-[13px] font-semibold text-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={!reason || busy}
            className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white transition-all ${
              reason && !busy ? 'bg-red hover:brightness-110' : 'cursor-not-allowed bg-ink/10 text-faint'
            }`}
          >
            {busy ? 'Reporting…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  )
}
