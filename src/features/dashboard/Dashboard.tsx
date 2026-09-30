import { useState } from 'react'
import { calculateCompleted, calculateDailyProgress, calculateProgress, calculateRemaining, hasPrayerOnDay, PRAYERS, type PrayerPlan, type PrayerRecord, type PrayerType } from '../../shared/types/domain'
import { dateLabel, dateTimeInputValue, formatNumber } from '../../shared/utils/date'
import { Icon } from '../../shared/ui/Icon'
import { Modal } from '../../shared/ui/Modal'

type ToastState = { message: string; undoIds?: string[] } | null

export function Dashboard({ plan, plans, records, onSelectPlan, onAdd, onToast, onCreate }: {
  plan: PrayerPlan | null
  plans: PrayerPlan[]
  records: PrayerRecord[]
  onSelectPlan: (id: string) => void
  onAdd: (types: PrayerType[], date?: string) => Promise<PrayerRecord[]>
  onToast: (toast: ToastState) => void
  onCreate: () => void
}) {
  const [orbOpen, setOrbOpen] = useState(false)
  const [multipleOpen, setMultipleOpen] = useState(false)
  const [detailedOpen, setDetailedOpen] = useState(false)
  const [detailedPrayer, setDetailedPrayer] = useState<PrayerType>('fajr')
  const [detailedDate, setDetailedDate] = useState(() => dateTimeInputValue(new Date()))
  const [duplicate, setDuplicate] = useState<{ types: PrayerType[]; labels: string[]; completedAt?: string } | null>(null)
  const [journeyInfo, setJourneyInfo] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const completed = calculateCompleted(records)
  const remaining = plan ? calculateRemaining(plan.totalPrayers, completed) : 0
  const progress = plan ? calculateProgress(completed, plan.totalPrayers) : 0
  const daily = calculateDailyProgress(records)
  const dailyGoal = plan?.dailyTarget ?? 0
  const dailyProgress = dailyGoal ? Math.min(daily / dailyGoal, 1) : 0
  const recordDates = records.map((record) => new Date(record.completedAt)).sort((a, b) => a.getTime() - b.getTime())
  const doAdd = async (types: PrayerType[], completedAt?: string, allowDuplicates = false) => {
    const date = completedAt ? new Date(completedAt) : new Date()
    const duplicates = types.filter((type) => hasPrayerOnDay(records, type, date))
    if (duplicates.length && !allowDuplicates) {
      setDuplicate({ types, labels: duplicates.map((type) => PRAYERS.find((prayer) => prayer.id === type)?.label ?? ''), completedAt })
      return
    }
    setBusy(true)
    try {
      const created = await onAdd(types, completedAt)
      if (!created.length) return
      setOrbOpen(false)
      setMultipleOpen(false)
      setDetailedOpen(false)
      setDuplicate(null)
      onToast({
        message: types.length > 1 ? `تم تسجيل ${formatNumber(types.length)} صلوات` : `تم تسجيل ${PRAYERS.find((prayer) => prayer.id === types[0])?.label}`,
        undoIds: created.map((record) => record.id),
      })
    } finally {
      setBusy(false)
    }
  }

  if (!plan) return <section className="welcome-screen"><div className="welcome-light">✳</div><p className="eyebrow">مسار الضوء</p><h2>رحلتك تبدأ<br />بخطوة بسيطة.</h2><p>أنشئ خطتك الأولى، وسنحفظ تقدمك على هذا الجهاز فقط.</p><button className="primary-button" onClick={onCreate}><Icon name="plus" />إنشاء خطتي الأولى</button><div className="privacy-inline">خصوصيتك أولًا · بياناتك لا تغادر جهازك</div></section>
  return <div className="dashboard-content">
    {plans.length > 1 && <label className="active-plan-picker">الخطة النشطة<select value={plan.id} onChange={(event) => onSelectPlan(event.target.value)}>{plans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    <section className="journey-panel">
      <div className="journey-copy"><span className="eyebrow journey-label">{plan.name}</span><div className="journey-count">{formatNumber(completed)}<span>صلاة مكتملة</span></div><div className="journey-remain"><span className="remain-mark">◦</span><span><strong>{formatNumber(remaining)}</strong> صلاة متبقية</span></div></div>
      <div className="journey-art" role="img" aria-label={`اكتمل ${formatNumber(Math.round(progress * 100))} بالمئة من الخطة`}>
        <svg viewBox="0 0 580 250" aria-label="نقاط تمثل تقدمك في الخطة">
          <defs><linearGradient id="path-gradient" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="var(--line-muted)" /><stop offset="100%" stopColor="var(--gold)" /></linearGradient><filter id="soft-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
          <path d="M18 220 C78 205 62 145 130 155 S205 210 240 145 S282 91 340 111 S407 159 440 91 S510 54 562 22" fill="none" stroke="var(--line-muted)" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" />
          <path d="M18 220 C78 205 62 145 130 155 S205 210 240 145 S282 91 340 111 S407 159 440 91 S510 54 562 22" fill="none" stroke="url(#path-gradient)" strokeWidth="2.5" strokeDasharray={`${Math.max(progress * 700, 0)} 700`} strokeLinecap="round" className="journey-progress-line" />
          {[{ x: 18, y: 220 }, { x: 130, y: 155 }, { x: 240, y: 145 }, { x: 340, y: 111 }, { x: 440, y: 91 }, { x: 562, y: 22 }].map((point, index) => <g key={point.x} className={`journey-node ${progress >= index / 5 ? 'lit-node' : 'quiet-node'}`} role="button" tabIndex={0} aria-label={`نقطة ${formatNumber(index)}، نحو ${formatNumber(Math.round(plan.totalPrayers * index / 5))} صلاة مكتملة`} aria-pressed={journeyInfo === index} onClick={() => setJourneyInfo(journeyInfo === index ? null : index)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setJourneyInfo(journeyInfo === index ? null : index) } }}><circle cx={point.x} cy={point.y} r={index === 5 ? 6 : 4} /><circle className="node-halo" cx={point.x} cy={point.y} r="11" /></g>)}
        </svg>
        {journeyInfo !== null && <div className="journey-point-popover" role="status"><strong>نحو {formatNumber(Math.round(plan.totalPrayers * journeyInfo / 5))} صلاة</strong><span>{formatNumber(journeyInfo * 20)}٪ من مسارك</span>{recordDates.length > 0 && <span>{dateLabel(recordDates[0].toISOString())} — {dateLabel(recordDates[recordDates.length - 1].toISOString())}</span>}</div>}
        <span className="journey-percent">{formatNumber(Math.round(progress * 100))}<small>٪ من الخطة</small></span>
        <span className="journey-start">بداية الرحلة</span><span className="journey-end">أفق قريب</span>
      </div>
    </section>
    <section className="action-section" aria-label="تسجيل صلاة">
      <div className={`prayer-orb-wrap${orbOpen ? ' is-open' : ''}`}><span className="orb-caption">{orbOpen ? 'اختر الصلاة' : 'كل صلاة تقرّبك'}</span>
        <button className="prayer-orb" onClick={() => setOrbOpen((open) => !open)} aria-expanded={orbOpen} aria-label={orbOpen ? 'إغلاق اختيار الصلاة' : 'سجّل صلاة'} disabled={busy}><span className="orb-star">✳</span><span>{orbOpen ? 'إلغاء' : 'سجّل صلاة'}</span></button>
        {orbOpen && <div className="prayer-choices">{PRAYERS.map((prayer, index) => <button key={prayer.id} className={`prayer-choice choice-${index + 1}`} onClick={() => void doAdd([prayer.id])} disabled={busy}>{hasPrayerOnDay(records, prayer.id) ? `✓ ${prayer.label}` : prayer.label}</button>)}</div>}
      </div>
      <div className="daily-goal"><div className="goal-heading"><span>هدف اليوم</span><strong>{daily >= dailyGoal ? 'اكتمل هدف اليوم' : `${formatNumber(daily)} من ${formatNumber(dailyGoal)}`}</strong></div><div className="goal-rail"><span style={{ width: `${dailyProgress * 100}%` }} /></div><span className="goal-foot">{formatNumber(daily)} صلوات اليوم · بلا استعجال، خطوة في وقتها</span></div>
    </section>
    <section className="today-prayers"><div className="section-heading"><h2>صلوات اليوم</h2><span>{formatNumber(daily)} مسجلة</span></div><div className="today-prayer-list">{PRAYERS.map((prayer) => { const exists = hasPrayerOnDay(records, prayer.id); return <button key={prayer.id} className={`today-prayer${exists ? ' recorded' : ''}`} onClick={() => void doAdd([prayer.id])} aria-label={`${exists ? 'مسجلة اليوم، سجل مرة أخرى: ' : 'سجل '}${prayer.label}`}><span>{exists ? '✓' : '·'}</span>{prayer.label}</button> })}</div></section>
    <section className="dashboard-bottom"><div className="quick-summary"><div><span>الخطة</span><strong>{formatNumber(plan.totalPrayers)} صلاة</strong></div><span className="summary-separator" /><div><span>وتيرة اليوم</span><strong>{formatNumber(plan.dailyTarget)} صلوات</strong></div></div><div className="record-actions"><button className="quiet-button" onClick={() => setMultipleOpen(true)}><Icon name="plus" />تسجيل عدة صلوات</button><button className="text-button" onClick={() => { setDetailedDate(dateTimeInputValue(new Date())); setDetailedOpen(true) }}>تسجيل بتفاصيل</button></div></section>
    {multipleOpen && <MultiPrayerDialog onClose={() => setMultipleOpen(false)} onSave={(values) => void doAdd(values)} busy={busy} />}
    {detailedOpen && <Modal title="تسجيل بتفاصيل" onClose={() => setDetailedOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void doAdd([detailedPrayer], new Date(detailedDate).toISOString()) }}><label className="field-label">الصلاة<select value={detailedPrayer} onChange={(event) => setDetailedPrayer(event.target.value as PrayerType)}>{PRAYERS.map((prayer) => <option key={prayer.id} value={prayer.id}>{prayer.label}</option>)}</select></label><label className="field-label">تاريخ الصلاة ووقتها<input type="datetime-local" value={detailedDate} onChange={(event) => setDetailedDate(event.target.value)} required /></label><div className="form-actions"><button type="button" className="quiet-button" onClick={() => setDetailedOpen(false)}>إلغاء</button><button className="primary-button" disabled={busy}>تسجيل الصلاة</button></div></form></Modal>}
    {duplicate && <Modal title="تسجيل مكرر؟" onClose={() => setDuplicate(null)}><p className="modal-intro">لقد سجلت {duplicate.labels.join(' و')} في هذا اليوم بالفعل. هل تريد تسجيلها مرة أخرى؟</p><div className="form-actions"><button className="quiet-button" onClick={() => setDuplicate(null)}>إلغاء</button><button className="primary-button" disabled={busy} onClick={() => void doAdd(duplicate.types, duplicate.completedAt, true)}>تسجيل مرة أخرى</button></div></Modal>}
  </div>
}

function MultiPrayerDialog({ onClose, onSave, busy }: { onClose: () => void; onSave: (types: PrayerType[]) => void; busy: boolean }) {
  const [selected, setSelected] = useState<PrayerType[]>([])
  return <Modal title="تسجيل عدة صلوات" onClose={onClose}><p className="modal-intro">اختر الصلوات التي تريد إضافتها إلى رحلتك.</p><div className="multi-options">{PRAYERS.map((prayer) => <label key={prayer.id} className="check-row"><input type="checkbox" checked={selected.includes(prayer.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, prayer.id] : current.filter((id) => id !== prayer.id))} /><span>{prayer.label}</span></label>)}</div><button className="primary-button full-button" disabled={!selected.length || busy} onClick={() => onSave(selected)}>تسجيل {selected.length ? formatNumber(selected.length) : ''} صلوات</button></Modal>
}
