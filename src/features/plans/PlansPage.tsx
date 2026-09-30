import { useState, type FormEvent } from 'react'
import { calculateProgress, validatePlan, type PrayerPlan, type PrayerRecord } from '../../shared/types/domain'
import { localDayKey } from '../../shared/types/domain'
import { formatNumber } from '../../shared/utils/date'
import { Icon } from '../../shared/ui/Icon'
import { Modal } from '../../shared/ui/Modal'

function todayKey() { return localDayKey(new Date()) }

export function PlanForm({ initial, onCancel, onSave }: { initial?: PrayerPlan; onCancel: () => void; onSave: (plan: PrayerPlan) => Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [total, setTotal] = useState(initial?.totalPrayers ? String(initial.totalPrayers) : '')
  const [target, setTarget] = useState(initial?.dailyTarget ? String(initial.dailyTarget) : '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayKey())
  const [validation, setValidation] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const totalNumber = Number(total)
    const targetNumber = Number(target)
    const validationMessage = validatePlan(name, totalNumber, targetNumber, startDate)
    if (validationMessage) { setValidation(validationMessage); return }
    setSaving(true)
    try { await onSave({ id: initial?.id ?? crypto.randomUUID(), name: name.trim(), totalPrayers: totalNumber, dailyTarget: targetNumber, startDate, createdAt: initial?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() }); onCancel() }
    catch (cause) { console.error('تعذر حفظ الخطة.', cause); setValidation('حدث خطأ أثناء حفظ الخطة. حاول مرة أخرى.') }
    finally { setSaving(false) }
  }
  return <form className="form-stack" onSubmit={(event) => void submit(event)} noValidate>
    <label className="field-label">اسم الخطة<input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: قضاء الصلوات" maxLength={64} autoFocus /></label>
    <label className="field-label">عدد الصلوات المتبقية<input type="number" min="1" step="1" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="مثال: ١٠٠٠" /></label>
    <label className="field-label">الهدف اليومي<input type="number" min="1" step="1" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="مثال: ٥" /></label>
    <label className="field-label">تاريخ بداية الخطة<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
    {validation && <p role="alert" className="field-error">{validation}</p>}
    <div className="form-actions"><button type="button" className="quiet-button" onClick={onCancel}>إلغاء</button><button className="primary-button" disabled={saving}>{saving ? 'جارٍ الحفظ...' : initial ? 'حفظ التغييرات' : 'إنشاء الخطة'}</button></div>
  </form>
}

export function Plans({ plans, records, activePlanId, onAdd, onUpdate, onDelete, onSelect }: { plans: PrayerPlan[]; records: PrayerRecord[]; activePlanId: string | null; onAdd: (plan: PrayerPlan) => Promise<void>; onUpdate: (plan: PrayerPlan) => Promise<void>; onDelete: (plan: PrayerPlan) => Promise<void>; onSelect: (id: string) => void }) {
  const [editing, setEditing] = useState<PrayerPlan | null>(null)
  const [creating, setCreating] = useState(() => new URLSearchParams(window.location.search).has('create'))
  const [deleting, setDeleting] = useState<PrayerPlan | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await onDelete(deleting)
      setDeleting(null)
      setDeleteError('')
    } catch (cause) {
      console.error('تعذر حذف الخطة.', cause)
      setDeleteError('حدث خطأ أثناء حذف الخطة. حاول مرة أخرى.')
    }
  }
  const plansWithCounts = plans.map((plan) => ({ plan, count: records.filter((record) => record.planId === plan.id).length }))
  return <div className="page-content"><div className="page-intro"><p>لكل رحلة إيقاعها الخاص. اختر خطتك النشطة في أي وقت.</p><button className="primary-button" onClick={() => setCreating(true)}><Icon name="plus" />خطة جديدة</button></div>
    {plans.length === 0 ? <div className="empty-state"><span className="empty-mark">✳</span><h2>رحلة واحدة تبدأ بنية.</h2><p>أنشئ خطة لتختار وتيرة تناسبك.</p><button className="text-button" onClick={() => setCreating(true)}>إنشاء أول خطة <Icon name="arrow" /></button></div> : <div className="plans-list">{plansWithCounts.map(({ plan, count }) => { const remaining = Math.max(plan.totalPrayers - count, 0); const progress = calculateProgress(count, plan.totalPrayers); return <article className={`plan-row${activePlanId === plan.id ? ' selected-plan' : ''}`} key={plan.id}><div className="plan-orbit">✳</div><div className="plan-main"><div className="plan-title-line"><h2>{plan.name}</h2>{activePlanId === plan.id && <span className="active-tag">الخطة النشطة</span>}</div><p>{formatNumber(count)} مكتملة <span>·</span> {formatNumber(remaining)} متبقية</p><div className="plan-rail"><span style={{ width: `${progress * 100}%` }} /></div><small>هدف يومي {formatNumber(plan.dailyTarget)} صلوات</small></div><div className="plan-actions">{activePlanId !== plan.id && <button className="quiet-button" onClick={() => onSelect(plan.id)}>اختيار</button>}<button className="icon-button" aria-label={`تعديل ${plan.name}`} onClick={() => setEditing(plan)}><Icon name="edit" /></button><button className="icon-button danger-icon" aria-label={`حذف ${plan.name}`} onClick={() => setDeleting(plan)}><Icon name="delete" /></button></div></article> })}</div>}
    {creating && <Modal title="خطة جديدة" onClose={() => setCreating(false)}><PlanForm onCancel={() => setCreating(false)} onSave={onAdd} /></Modal>}
    {editing && <Modal title="تعديل الخطة" onClose={() => setEditing(null)}><PlanForm initial={editing} onCancel={() => setEditing(null)} onSave={onUpdate} /></Modal>}
    {deleting && <Modal title="حذف الخطة؟" onClose={() => setDeleting(null)}><p className="modal-intro">سيؤدي حذف «{deleting.name}» إلى حذف تسجيلاتها أيضًا. لا يمكن التراجع عن هذا الإجراء.</p>{deleteError && <p className="field-error" role="alert">{deleteError}</p>}<div className="form-actions"><button className="quiet-button" onClick={() => setDeleting(null)}>إلغاء</button><button className="danger-button" onClick={() => void confirmDelete()}>حذف الخطة</button></div></Modal>}
  </div>
}
