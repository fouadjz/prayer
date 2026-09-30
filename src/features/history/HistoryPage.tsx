import { useMemo, useState, type FormEvent } from 'react'
import { localDayKey, PRAYERS, type PrayerRecord, type PrayerType } from '../../shared/types/domain'
import { dateLabel, dateTimeInputValue, formatNumber } from '../../shared/utils/date'
import { Icon } from '../../shared/ui/Icon'
import { Modal } from '../../shared/ui/Modal'

type ToastState = { message: string } | null
function todayKey(date = new Date()) { return localDayKey(date) }

export function History({ records, onUpdate, onDelete, onToast }: { records: PrayerRecord[]; onUpdate: (record: PrayerRecord) => Promise<void>; onDelete: (record: PrayerRecord) => Promise<void>; onToast: (toast: ToastState) => void }) {
  const [filter, setFilter] = useState<PrayerType | 'all'>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [editing, setEditing] = useState<PrayerRecord | null>(null)
  const [deleting, setDeleting] = useState<PrayerRecord | null>(null)
  const [editPrayer, setEditPrayer] = useState<PrayerType>('fajr')
  const [editDate, setEditDate] = useState('')
  const [actionError, setActionError] = useState('')
  const filtered = records.filter((record) => (filter === 'all' || record.prayerType === filter) && (!dateFilter || localDayKey(new Date(record.completedAt)) === dateFilter)).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  const grouped = useMemo(() => filtered.reduce<Record<string, PrayerRecord[]>>((groups, record) => { const day = todayKey(new Date(record.completedAt)); (groups[day] ??= []).push(record); return groups }, {}), [filtered])
  const startEdit = (record: PrayerRecord) => { setEditing(record); setEditPrayer(record.prayerType); setEditDate(dateTimeInputValue(new Date(record.completedAt))) }
  const saveEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing || !editDate) return
    try {
      await onUpdate({ ...editing, prayerType: editPrayer, completedAt: new Date(editDate).toISOString() })
      setEditing(null)
      setActionError('')
      onToast({ message: 'تم تعديل تسجيل الصلاة.' })
    } catch (cause) {
      console.error('تعذر تعديل التسجيل.', cause)
      setActionError('حدث خطأ أثناء تعديل التسجيل. حاول مرة أخرى.')
    }
  }
  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await onDelete(deleting)
      setDeleting(null)
      setActionError('')
      onToast({ message: 'تم حذف تسجيل الصلاة.' })
    } catch (cause) {
      console.error('تعذر حذف التسجيل.', cause)
      setActionError('حدث خطأ أثناء حذف التسجيل. حاول مرة أخرى.')
    }
  }
  return <div className="page-content"><div className="page-intro"><p>كل تسجيل نقطة ضوء في طريقك.</p><span className="record-total">{formatNumber(filtered.length)} تسجيل</span></div><div className="filter-strip"><button className={filter === 'all' ? 'filter-chip active' : 'filter-chip'} onClick={() => setFilter('all')}>الكل</button>{PRAYERS.map((prayer) => <button key={prayer.id} className={filter === prayer.id ? 'filter-chip active' : 'filter-chip'} onClick={() => setFilter(prayer.id)}>{prayer.label}</button>)}<label className="date-filter">التاريخ<input aria-label="تصفية حسب التاريخ" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label></div>
    {!filtered.length ? <div className="empty-state"><span className="empty-mark">✳</span><h2>{records.length ? 'لا توجد نتائج لهذا الاختيار.' : 'ما زالت الصفحات الأولى تنتظرك.'}</h2><p>عندما تسجل صلاة ستظهر هنا في مسار رحلتك.</p></div> : <div className="timeline">{Object.entries(grouped).map(([day, dayRecords]) => <section className="timeline-day" key={day}><h2>{day === todayKey() ? 'اليوم' : dateLabel(day)}</h2><div className="timeline-items">{dayRecords.map((record) => <article className="timeline-item" key={record.id}><span className="timeline-dot" /><div className="timeline-detail"><strong>{PRAYERS.find((prayer) => prayer.id === record.prayerType)?.label}</strong><time>{new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit' }).format(new Date(record.completedAt))}</time></div><div className="timeline-actions"><button className="icon-button" aria-label="تعديل التسجيل" onClick={() => startEdit(record)}><Icon name="edit" /></button><button className="icon-button danger-icon" aria-label="حذف التسجيل" onClick={() => setDeleting(record)}><Icon name="delete" /></button></div></article>)}</div></section>)}</div>}
    {editing && <Modal title="تعديل التسجيل" onClose={() => setEditing(null)}><form className="form-stack" onSubmit={(event) => void saveEdit(event)}><label className="field-label">الصلاة<select value={editPrayer} onChange={(event) => setEditPrayer(event.target.value as PrayerType)}>{PRAYERS.map((prayer) => <option key={prayer.id} value={prayer.id}>{prayer.label}</option>)}</select></label><label className="field-label">التاريخ والوقت<input type="datetime-local" value={editDate} onChange={(event) => setEditDate(event.target.value)} required /></label>{actionError && <p className="field-error" role="alert">{actionError}</p>}<div className="form-actions"><button type="button" className="quiet-button" onClick={() => setEditing(null)}>إلغاء</button><button className="primary-button">حفظ التعديل</button></div></form></Modal>}
    {deleting && <Modal title="حذف التسجيل؟" onClose={() => setDeleting(null)}><p className="modal-intro">هل تريد حذف تسجيل صلاة {PRAYERS.find((prayer) => prayer.id === deleting.prayerType)?.label}؟</p>{actionError && <p className="field-error" role="alert">{actionError}</p>}<div className="form-actions"><button className="quiet-button" onClick={() => setDeleting(null)}>إلغاء</button><button className="danger-button" onClick={() => void confirmDelete()}>حذف التسجيل</button></div></Modal>}
  </div>
}
