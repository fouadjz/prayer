import { useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { AppSettings } from '../../shared/types/domain'
import { Icon } from '../../shared/ui/Icon'
import { Modal } from '../../shared/ui/Modal'

export function Settings({ settings, onSettings, onExport, onImport, onDeleteAll }: { settings: AppSettings; onSettings: (settings: AppSettings) => Promise<void>; onExport: () => void; onImport: (file: File) => void; onDeleteAll: () => Promise<void> }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const deleteData = async () => {
    setDeleting(true)
    try {
      await onDeleteAll()
      setConfirmDelete(false)
      setDeleteError('')
    } catch (cause) {
      console.error('تعذر حذف البيانات المحلية.', cause)
      setDeleteError('تعذر حذف البيانات. حاول مرة أخرى.')
    } finally {
      setDeleting(false)
    }
  }
  return <div className="page-content settings-page"><div className="page-intro"><p>اجعل التطبيق أقرب لما يناسبك.</p></div><section className="settings-section"><div><h2>المظهر</h2><p>ضوء يناسب وقتك.</p></div><div className="theme-switch" role="group" aria-label="اختيار المظهر">{([{ value: 'light', label: 'فاتح' }, { value: 'dark', label: 'داكن' }, { value: 'system', label: 'النظام' }] as const).map((theme) => <button key={theme.value} className={settings.theme === theme.value ? 'selected' : ''} onClick={() => void onSettings({ ...settings, theme: theme.value })}>{theme.value === 'light' ? <Icon name="sun" /> : theme.value === 'dark' ? <Icon name="moon" /> : null}{theme.label}</button>)}</div></section><section className="settings-section"><div><h2>اللغة</h2><p>اللغة العربية هي لغة رحلتك.</p></div><span className="language-pill">العربية</span></section><section className="settings-section"><div><h2>التنبيهات</h2><p>التنبيهات غير مفعلة في هذه النسخة.</p></div><span className="quiet-tag">قريبًا</span></section><section className="settings-section privacy-section"><div><h2>خصوصيتك</h2><p>بياناتك محفوظة على هذا الجهاز. لا نرسل بيانات صلواتك إلى أي خادم.</p></div><span className="privacy-check">محلي وآمن</span></section><section className="settings-section data-section"><div><h2>بياناتك</h2><p>احتفظ بنسخة أو انقل بياناتك إلى جهاز آخر.</p></div><div className="data-actions"><button className="quiet-button" onClick={onExport}><Icon name="download" />تصدير البيانات</button><button className="quiet-button file-button" onClick={() => fileInput.current?.click()}><Icon name="arrow" />استيراد البيانات</button><input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) setImportFile(file); event.currentTarget.value = '' }} /><button className="danger-text-button" onClick={() => setConfirmDelete(true)}>حذف جميع البيانات</button></div></section><NavLink className="about-link" to="/about">عن التطبيق <Icon name="arrow" /></NavLink>
    {confirmDelete && <Modal title="حذف جميع البيانات؟" onClose={() => setConfirmDelete(false)}><p className="modal-intro">سيتم حذف جميع الخطط والتسجيلات والإعدادات المحلية. هذا الإجراء لا يمكن التراجع عنه.</p>{deleteError && <p className="field-error" role="alert">{deleteError}</p>}<div className="form-actions"><button className="quiet-button" disabled={deleting} onClick={() => setConfirmDelete(false)}>إلغاء</button><button className="danger-button" disabled={deleting} onClick={() => void deleteData()}>{deleting ? 'جارٍ الحذف...' : 'حذف كل البيانات'}</button></div></Modal>}
    {importFile && <Modal title="استيراد نسخة البيانات؟" onClose={() => setImportFile(null)}><p className="modal-intro">سيتم التحقق من الملف أولًا، ثم استبدال بيانات التطبيق الحالية بما في النسخة الاحتياطية.</p><div className="form-actions"><button className="quiet-button" onClick={() => setImportFile(null)}>إلغاء</button><button className="primary-button" onClick={() => { onImport(importFile); setImportFile(null) }}>التحقق والاستيراد</button></div></Modal>}
  </div>
}
