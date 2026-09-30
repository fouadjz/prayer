import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { isValidBackup, localDayKey, type AppSettings, type PrayerPlan, type PrayerRecord, type PrayerType } from './shared/types/domain'
import { repository } from './infrastructure/storage/repository'
import { Dashboard } from './features/dashboard/Dashboard'
import { recordPrayers, undoPrayerRecords } from './features/prayers/services/prayerService'
import { Plans } from './features/plans/PlansPage'
import { History } from './features/history/HistoryPage'
import { Statistics } from './features/statistics/StatisticsPage'
import { Settings } from './features/settings/SettingsPage'
import { About } from './features/about/AboutPage'
import { Icon } from './shared/ui/Icon'
import { dateLabel } from './shared/utils/date'
import './App.css'

type RouteName = '/' | '/plans' | '/history' | '/statistics' | '/settings' | '/about'
type Backup = { version: 1; plans: PrayerPlan[]; prayerRecords: PrayerRecord[]; settings: AppSettings }
type ToastState = { message: string; undoIds?: string[] } | null

const links: { to: RouteName; label: string; icon: string }[] = [
  { to: '/', label: 'الرئيسية', icon: 'home' },
  { to: '/plans', label: 'الخطط', icon: 'plan' },
  { to: '/history', label: 'السجل', icon: 'history' },
  { to: '/statistics', label: 'الإحصائيات', icon: 'stats' },
]

function todayKey(date = new Date()) {
  return localDayKey(date)
}

function App() {
  return <BrowserRouter><Application /></BrowserRouter>
}

function Application() {
  const [plans, setPlans] = useState<PrayerPlan[]>([])
  const [records, setRecords] = useState<PrayerRecord[]>([])
  const [settings, setSettings] = useState<AppSettings>({ theme: 'system', language: 'ar', activePlanId: null })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastState>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const location = useLocation()
  const navigate = useNavigate()
  const activePlan = plans.find((plan) => plan.id === settings.activePlanId) ?? plans[0] ?? null
  const activeRecords = activePlan ? records.filter((record) => record.planId === activePlan.id) : []

  useEffect(() => {
    let mounted = true
    void Promise.all([repository.plans.getAll(), repository.prayers.getAll(), repository.settings.get()])
      .then(([nextPlans, nextRecords, nextSettings]) => {
        if (mounted) {
          setPlans(nextPlans)
          setRecords(nextRecords)
          setSettings(nextSettings)
          setReady(true)
        }
      })
      .catch((cause: unknown) => {
        console.error('تعذر تحميل بيانات التطبيق المحلية.', cause)
        if (mounted) { setError('تعذر تحميل بياناتك المحلية. أعد تحميل الصفحة وحاول مرة أخرى.'); setReady(true) }
      })
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js')
        .then(async () => {
          await navigator.serviceWorker.ready
          const urls = performance.getEntriesByType('resource')
            .map((entry) => new URL(entry.name, window.location.href))
            .filter((url) => url.origin === window.location.origin)
            .map((url) => `${url.pathname}${url.search}`)
          const cache = await caches.open('fatatni-salat-v1')
          await cache.addAll([...new Set(urls)])
        })
        .catch((cause: unknown) => console.error('تعذر تفعيل وضع عدم الاتصال.', cause))
    }
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    applyTheme()
    if (settings.theme === 'system') media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [settings.theme])

  const saveSettings = async (nextSettings: AppSettings) => {
    await repository.settings.save(nextSettings)
    setSettings(nextSettings)
  }

  const addPlan = async (plan: PrayerPlan) => {
    const nextSettings = { ...settings, activePlanId: plan.id }
    await repository.plans.add(plan, nextSettings)
    setSettings(nextSettings)
    setPlans((current) => [...current, plan])
    setToast({ message: 'تم إنشاء الخطة.' })
    navigate('/')
  }

  const updatePlan = async (plan: PrayerPlan) => {
    await repository.plans.update(plan)
    setPlans((current) => current.map((item) => item.id === plan.id ? plan : item))
    setToast({ message: 'تم تعديل الخطة.' })
  }

  const deletePlan = async (plan: PrayerPlan) => {
    const nextPlans = plans.filter((item) => item.id !== plan.id)
    const nextActive = settings.activePlanId === plan.id ? nextPlans[0]?.id ?? null : settings.activePlanId
    const nextSettings = { ...settings, activePlanId: nextActive }
    await repository.plans.delete(plan.id, nextSettings)
    setPlans(nextPlans)
    setRecords((current) => current.filter((record) => record.planId !== plan.id))
    setSettings(nextSettings)
    setToast({ message: 'تم حذف الخطة.' })
  }

  const addPrayers = async (types: PrayerType[], completedAt = new Date().toISOString()) => {
    if (!activePlan) return []
    const created = await recordPrayers(repository.prayers, activePlan.id, types, completedAt)
    setRecords((current) => [...created, ...current])
    return created
  }

  const undoPrayers = async (ids: string[]) => {
    const recordsToUndo = records.filter((record) => ids.includes(record.id))
    await undoPrayerRecords(repository.prayers, recordsToUndo)
    setRecords((current) => current.filter((record) => !ids.includes(record.id)))
    setToast(null)
  }

  const updateRecord = async (record: PrayerRecord) => {
    await repository.prayers.update(record)
    setRecords((current) => current.map((item) => item.id === record.id ? record : item))
  }

  const deleteRecord = async (record: PrayerRecord) => {
    await repository.prayers.delete(record.id)
    setRecords((current) => current.filter((item) => item.id !== record.id))
  }

  const exportData = async () => {
    const backup: Backup = { version: 1, plans, prayerRecords: records, settings }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fatatni-salat-${todayKey()}.json`
    link.click()
    URL.revokeObjectURL(url)
    setToast({ message: 'تم تصدير البيانات.' })
  }

  const refresh = async () => {
    const [nextPlans, nextRecords, nextSettings] = await Promise.all([
      repository.plans.getAll(),
      repository.prayers.getAll(),
      repository.settings.get(),
    ])
    setPlans(nextPlans)
    setRecords(nextRecords)
    setSettings(nextSettings)
  }

  const runSafely = async <T,>(action: () => Promise<T>, message: string, fallback: T): Promise<T> => {
    try {
      return await action()
    } catch (cause) {
      console.error(message, cause)
      setError(message)
      return fallback
    }
  }

  const runOrThrow = async (action: () => Promise<void>, message: string) => {
    try {
      await action()
    } catch (cause) {
      console.error(message, cause)
      setError(message)
      throw cause
    }
  }

  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isValidBackup(parsed)) throw new Error('invalid')
      await repository.replaceAll(parsed.plans, parsed.prayerRecords, parsed.settings)
      await refresh()
      setError('')
      setToast({ message: 'تم استيراد البيانات بنجاح.' })
    } catch (cause) {
      console.error('تعذر استيراد البيانات.', cause)
      setError('البيانات المستوردة غير صالحة أو تعذر قراءتها.')
    }
  }

  const deleteAllData = async () => {
    await repository.clear()
    setPlans([])
    setRecords([])
    const defaults: AppSettings = { theme: 'system', language: 'ar', activePlanId: null }
    setSettings(defaults)
    setError('')
    navigate('/')
  }

  const pageTitle = location.pathname === '/' ? 'الرئيسية' : location.pathname === '/about' ? 'عن التطبيق' : links.find((item) => item.to === location.pathname)?.label ?? 'الإعدادات'
  const onHome = location.pathname === '/'

  return <div className="app-shell min-h-screen" dir="rtl">
    <aside className="sidebar">
      <NavLink to="/" className="brand"><span className="brand-mark">✳</span><span>فاتتني صلاة<small>مسار الضوء</small></span></NavLink>
      <nav className="side-links" aria-label="القائمة الرئيسية">{links.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}><Icon name={item.icon} />{item.label}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><span className="privacy-dot" />بياناتك تبقى على هذا الجهاز</div><NavLink className="side-link settings-link" to="/settings"><Icon name="settings" />الإعدادات</NavLink></div>
    </aside>
    <main className={`main-area${onHome ? ' home-area' : ''}`}>
      <header className="topbar"><div><span className="eyebrow">{dateLabel(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1>{pageTitle}</h1></div><NavLink to="/settings" className="icon-button mobile-settings" aria-label="الإعدادات"><Icon name="settings" /></NavLink></header>
      {!ready ? <div className="loading-state"><span className="loading-orb" />جارٍ تهيئة رحلتك...</div> : error && <div className="notice error-notice" role="alert"><span>{error}</span><button className="text-button" onClick={() => setError('')} aria-label="إغلاق">×</button></div>}
      {toast && <Toast toast={toast} onDismiss={dismissToast} onUndo={toast.undoIds ? () => { void runSafely(() => undoPrayers(toast.undoIds ?? []), 'تعذر التراجع عن التسجيل. حاول مرة أخرى.', undefined) } : undefined} />}
      {ready && <Routes>
        <Route path="/" element={<Dashboard plan={activePlan} plans={plans} records={activeRecords} onSelectPlan={(id) => { void runSafely(async () => { await saveSettings({ ...settings, activePlanId: id }) }, 'تعذر اختيار الخطة. حاول مرة أخرى.', undefined) }} onAdd={(types, date) => runSafely(() => addPrayers(types, date), 'حدث خطأ أثناء حفظ الصلاة. حاول مرة أخرى.', [])} onToast={setToast} onCreate={() => navigate('/plans?create=1')} />} />
        <Route path="/plans" element={<Plans plans={plans} records={records} activePlanId={activePlan?.id ?? null} onAdd={addPlan} onUpdate={updatePlan} onDelete={(plan) => runOrThrow(() => deletePlan(plan), 'حدث خطأ أثناء حذف الخطة وتسجيلاتها. حاول مرة أخرى.')} onSelect={(id) => { void runSafely(async () => { await saveSettings({ ...settings, activePlanId: id }); navigate('/') }, 'تعذر اختيار الخطة. حاول مرة أخرى.', undefined) }} />} />
        <Route path="/history" element={<History records={activeRecords} onToast={setToast} onUpdate={(record) => runOrThrow(() => updateRecord(record), 'حدث خطأ أثناء تعديل التسجيل. حاول مرة أخرى.')} onDelete={(record) => runOrThrow(() => deleteRecord(record), 'حدث خطأ أثناء حذف التسجيل. حاول مرة أخرى.')} />} />
        <Route path="/statistics" element={<Statistics plan={activePlan} records={activeRecords} />} />
        <Route path="/settings" element={<Settings settings={settings} onSettings={(value) => runSafely(() => saveSettings(value), 'تعذر حفظ الإعدادات. حاول مرة أخرى.', undefined)} onExport={() => void runSafely(exportData, 'تعذر تصدير البيانات. حاول مرة أخرى.', undefined)} onImport={(file) => void importData(file)} onDeleteAll={() => runOrThrow(deleteAllData, 'تعذر حذف البيانات المحلية. حاول مرة أخرى.')} />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>}
    </main>
    <nav className="mobile-nav" aria-label="التنقل">{links.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `mobile-link${isActive ? ' active' : ''}`}><Icon name={item.icon} />{item.label}</NavLink>)}</nav>
  </div>
}

function Toast({ toast, onDismiss, onUndo }: { toast: Exclude<ToastState, null>; onDismiss: () => void; onUndo?: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 6000)
    return () => window.clearTimeout(timer)
  }, [onDismiss, toast.message])
  return <div className="toast-message" role="status" aria-live="polite"><span className="toast-dot" />{toast.message}{onUndo && <button className="toast-action" onClick={onUndo}>تراجع</button>}<button className="toast-dismiss" aria-label="إغلاق الإشعار" onClick={onDismiss}>×</button></div>
}

export default App
