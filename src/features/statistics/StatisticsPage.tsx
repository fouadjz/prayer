import { calculateCompleted, calculateDailyProgress, calculatePeriodProgress, calculateProgress, calculateRemaining, groupByPrayerType, PRAYERS, type PrayerPlan, type PrayerRecord } from '../../shared/types/domain'
import { formatNumber } from '../../shared/utils/date'

export function Statistics({ plan, records }: { plan: PrayerPlan | null; records: PrayerRecord[] }) {
  const periods = [
    { title: 'اليوم', count: calculateDailyProgress(records) },
    { title: 'هذا الأسبوع', count: calculatePeriodProgress(records, 'week') },
    { title: 'هذا الشهر', count: calculatePeriodProgress(records, 'month') },
  ]
  const grouped = groupByPrayerType(records)
  const maxCount = Math.max(...PRAYERS.map((prayer) => grouped[prayer.id]), 1)
  const completed = calculateCompleted(records)
  const remaining = plan ? calculateRemaining(plan.totalPrayers, completed) : 0
  if (records.length === 0) return <div className="page-content"><div className="empty-state stats-empty"><span className="empty-mark">✳</span><h2>ستظهر آثار الرحلة هنا.</h2><p>بعد تسجيل أول صلاة، ستجد إيقاع أيامك وتفاصيل التقدم في هذا المكان.</p></div></div>
  return <div className="page-content"><div className="page-intro"><p>أثر كل خطوة، في صورة قريبة وواضحة.</p></div><section className="stats-overview"><div className="stat-primary"><span>مكتملة</span><strong>{formatNumber(completed)}</strong><small>صلاة على الطريق</small></div><div className="stat-secondary"><span>متبقية</span><strong>{formatNumber(remaining)}</strong></div><div className="stat-secondary"><span>النسبة</span><strong>{formatNumber(Math.round(calculateProgress(completed, plan?.totalPrayers ?? 0) * 100))}<small>٪</small></strong></div></section><section className="stats-section"><div className="section-heading"><h2>إيقاع الأيام</h2><span>تسجيلاتك حسب الوقت</span></div><div className="period-list">{periods.map((period) => <div className="period-row" key={period.title}><span>{period.title}</span><strong>{formatNumber(period.count)}</strong></div>)}</div></section><section className="stats-section prayer-breakdown"><div className="section-heading"><h2>على امتداد الصلوات</h2><span>كل ضوء في مكانه</span></div>{PRAYERS.map((prayer) => { const count = grouped[prayer.id]; return <div className="prayer-stat-row" key={prayer.id}><span>{prayer.label}</span><div className="prayer-stat-rail"><span style={{ width: `${count / maxCount * 100}%` }} /></div><strong>{formatNumber(count)}</strong></div> })}</section></div>
}
