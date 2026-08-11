import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BadgeCheck, CircleCheck, HeartHandshake, MapPin, Timer, Wallet } from 'lucide-react'
import { Card, Donut, DonutLegend, StatCard } from '../../components/charts'
import { BudgetBar } from '../../components/BudgetBar'
import { StatusChip } from '../../components/StatusChip'
import { budgetShort, compact, relativeTime } from '../../lib/format'
import { CATEGORY_META } from '../../lib/constants'
import { budgetTotals, statusBreakdown, supportTotal } from '../../lib/analytics'
import { getDeptById } from '../../lib/departments'
import { useApp } from '../../lib/store'

export default function Overview() {
  const { issues, org } = useApp()
  const navigate = useNavigate()
  if (!org) return null

  const deptInfo = getDeptById(org.department)
  const deptIssues = deptInfo ? issues.filter((i) => deptInfo.categories.includes(i.category)) : issues

  const status = statusBreakdown(deptIssues)
  const total = deptIssues.length
  const open = deptIssues.filter((i) => i.status !== 'completed').length
  const overdue = deptIssues.filter((i) => i.status === 'overdue').length
  const completed = deptIssues.filter((i) => i.status === 'completed').length
  const budget = budgetTotals(deptIssues)
  const support = supportTotal(deptIssues)
  const urgent = deptIssues
    .filter((i) => i.status === 'overdue' || i.days >= 18)
    .sort((a, b) => b.days - a.days)
  const myUpdates = deptIssues
    .filter((i) => i.official && i.official.agency === org.org_name)
    .slice(0, 4)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{deptInfo?.name ?? 'Department'} overview</h1>
          <p className="mt-0.5 text-[12px] text-muted">Live snapshot from verified citizen reports for your department.</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-green/30 bg-green/10 px-3 py-1.5 text-[11px] font-bold text-green">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green" /> Live · real data
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total issues" value={total} sub="in your department" icon={<MapPin size={16} />} />
        <StatCard label="Open" value={open} sub="awaiting action" color="text-orange" icon={<Timer size={16} />} accent="bg-orange/15 text-orange" />
        <StatCard label="Overdue" value={overdue} sub="past deadline" color="text-red" icon={<AlertTriangle size={16} />} accent="bg-red/15 text-red" />
        <StatCard label="Completed" value={completed} sub="with proof" color="text-green" icon={<CircleCheck size={16} />} />
        <StatCard label="Budget tracked" value={budgetShort(budget.total)} sub={`${budget.pct}% utilised`} color="text-purple" icon={<Wallet size={16} />} accent="bg-purple/15 text-purple" />
        <StatCard label="Citizen support" value={compact(support)} sub="total upvotes" color="text-blue" icon={<HeartHandshake size={16} />} accent="bg-blue/15 text-blue" />
      </div>

      {/* pipeline + budget */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Issue pipeline" action={<span className="text-[11px] font-semibold text-muted">by status</span>}>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <Donut data={status.map((s) => ({ label: s.label, value: s.count, hex: s.hex }))} centerLabel={String(total)} centerSub="issues" />
            <div className="w-full flex-1">
              <DonutLegend data={status.map((s) => ({ label: s.label, value: s.count, hex: s.hex }))} />
            </div>
          </div>
        </Card>

        <Card title="Budget utilisation" action={<span className="text-[11px] font-semibold text-purple">{budgetShort(budget.spent)} spent</span>}>
          <div className="rounded-xl bg-surface2 p-3.5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted">Total sanctioned</p>
                <p className="mt-0.5 text-2xl font-extrabold text-purple">{budgetShort(budget.total)}</p>
              </div>
              <p className="text-[12px] font-semibold text-muted">{budget.pct}% utilised</p>
            </div>
            <BudgetBar pct={budget.pct} color="purple" className="mt-3" heightClass="h-2.5" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-bg/60 p-2.5">
                <p className="text-[10px] font-semibold uppercase text-muted">Spent</p>
                <p className="mt-0.5 text-sm font-bold text-green">{budgetShort(budget.spent)}</p>
              </div>
              <div className="rounded-xl bg-bg/60 p-2.5">
                <p className="text-[10px] font-semibold uppercase text-muted">Remaining</p>
                <p className="mt-0.5 text-sm font-bold text-orange">{budgetShort(budget.remaining)}</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Update sanctioned &amp; spent amounts from the Issues tab — they publish to the citizen feed instantly.
          </p>
        </Card>
      </div>

      {/* urgent + my updates */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card
          title="Needs urgent attention"
          action={<span className="flex items-center gap-1 text-[11px] font-bold text-red"><AlertTriangle size={12} /> {urgent.length}</span>}
        >
          <div className="space-y-2">
            {urgent.length === 0 && (
              <p className="py-6 text-center text-[12.5px] text-muted">Nothing overdue — great work! 🎉</p>
            )}
            {urgent.map((i) => (
              <button
                key={i.id}
                onClick={() => navigate(`/issue/${i.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-bg/50 p-3 text-left transition-colors hover:border-red/40"
              >
                <span className="text-lg">{CATEGORY_META[i.category]?.emoji ?? '📍'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">{i.title}</span>
                  <span className="block text-[11px] text-muted">📍 {i.area} · {i.category}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-red">
                  <Timer size={12} /> {i.days}d
                </span>
                <StatusChip status={i.status} />
              </button>
            ))}
          </div>
        </Card>

        <Card title="Updates posted by your org" action={<span className="flex items-center gap-1 text-[11px] font-semibold text-blue"><BadgeCheck size={12} /> verified</span>}>
          {myUpdates.length === 0 ? (
            <p className="py-8 text-center text-[12.5px] text-muted">
              No updates yet — post your first one from the Issues tab.
            </p>
          ) : (
            <div className="space-y-2">
              {myUpdates.map((i) => (
                <div key={i.id} className="rounded-xl border border-line bg-bg/50 p-3">
                  <div className="flex items-center gap-2 text-[12px] font-bold">
                    <span className="truncate">{i.title}</span>
                    <span className="ml-auto shrink-0 text-[10.5px] font-medium text-muted">{relativeTime(i.official?.postedAt)}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{i.official?.text}</p>
                  {i.official?.progress !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-green to-emerald-400" style={{ width: `${i.official.progress}%` }} />
                      </div>
                      <span className="text-[10.5px] font-bold text-green">{i.official.progress}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
