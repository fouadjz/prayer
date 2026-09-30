export const PRAYERS = [
  { id: 'fajr', label: 'الفجر' },
  { id: 'dhuhr', label: 'الظهر' },
  { id: 'asr', label: 'العصر' },
  { id: 'maghrib', label: 'المغرب' },
  { id: 'isha', label: 'العشاء' },
] as const

export type PrayerType = typeof PRAYERS[number]['id']

export interface PrayerRecord {
  id: string
  planId: string
  prayerType: PrayerType
  completedAt: string
  createdAt?: string
}

export interface PrayerPlan {
  id: string
  name: string
  totalPrayers: number
  dailyTarget: number
  startDate: string
  createdAt: string
  updatedAt?: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'ar'
  activePlanId: string | null
}

export function localDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function calculateRemaining(total: number, completed: number) {
  return Math.max(total - completed, 0)
}

export function calculateCompleted(records: PrayerRecord[]) {
  return records.length
}

export function calculateProgress(completed: number, total: number) {
  return total > 0 ? Math.min(Math.max(completed, 0) / total, 1) : 0
}

export function calculateDailyProgress(records: PrayerRecord[], date = new Date()) {
  const key = localDayKey(date)
  return records.filter((record) => {
    const completedAt = new Date(record.completedAt)
    return localDayKey(completedAt) === key && completedAt <= date
  }).length
}

export function calculatePeriodProgress(records: PrayerRecord[], period: 'week' | 'month', now = new Date()) {
  const start = new Date(now)
  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    start.setHours(0, 0, 0, 0)
    return records.filter((record) => {
      const completedAt = new Date(record.completedAt)
      return completedAt >= start && completedAt <= now
    }).length
  }
  return records.filter((record) => {
    const date = new Date(record.completedAt)
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date <= now
  }).length
}

export function hasPrayerOnDay(records: PrayerRecord[], prayerType: PrayerType, date = new Date()) {
  const targetDay = localDayKey(date)
  return records.some((record) =>
    record.prayerType === prayerType && localDayKey(new Date(record.completedAt)) === targetDay,
  )
}

export function groupByPrayerType(records: PrayerRecord[]) {
  const counts: Record<PrayerType, number> = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }
  for (const record of records) counts[record.prayerType] += 1
  return counts
}

export function validatePlan(name: string, total: number, dailyTarget: number, startDate = localDayKey(new Date())) {
  if (!name.trim()) return 'اكتب اسمًا واضحًا للخطة.'
  if (!Number.isSafeInteger(total) || total <= 0) return 'أدخل عددًا صحيحًا للصلوات أكبر من صفر.'
  if (!Number.isSafeInteger(dailyTarget) || dailyTarget <= 0 || dailyTarget > total) return 'يجب أن يكون الهدف اليومي أكبر من صفر ولا يتجاوز عدد صلوات الخطة.'
  const parsedStartDate = new Date(`${startDate}T00:00:00`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(parsedStartDate.getTime()) || localDayKey(parsedStartDate) !== startDate) return 'أدخل تاريخ بداية صالحًا.'
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value
}

function isIsoTimestamp(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:0\d|1\d|2[0-3]):[0-5]\d)$/.exec(value)
  return match !== null && isDateOnly(match[1]) && !Number.isNaN(Date.parse(value))
}

function isPlan(value: unknown): value is PrayerPlan {
  return isRecord(value) && typeof value.id === 'string' && value.id.trim() === value.id && value.id.length > 0 &&
    typeof value.name === 'string' && value.name.trim().length > 0 &&
    Number.isSafeInteger(value.totalPrayers) && Number(value.totalPrayers) > 0 &&
    Number.isSafeInteger(value.dailyTarget) && Number(value.dailyTarget) > 0 &&
    Number(value.dailyTarget) <= Number(value.totalPrayers) &&
    typeof value.startDate === 'string' && isDateOnly(value.startDate) &&
    typeof value.createdAt === 'string' && isIsoTimestamp(value.createdAt) &&
    (value.updatedAt === undefined || (typeof value.updatedAt === 'string' && isIsoTimestamp(value.updatedAt)))
}

function isPrayerRecord(value: unknown): value is PrayerRecord {
  return isRecord(value) && typeof value.id === 'string' && value.id.trim() === value.id && value.id.length > 0 &&
    typeof value.planId === 'string' && value.planId.trim() === value.planId && value.planId.length > 0 &&
    PRAYERS.some((prayer) => prayer.id === value.prayerType) &&
    typeof value.completedAt === 'string' && isIsoTimestamp(value.completedAt) &&
    (value.createdAt === undefined || (typeof value.createdAt === 'string' && isIsoTimestamp(value.createdAt)))
}

export function isValidBackup(value: unknown): value is { version: 1; plans: PrayerPlan[]; prayerRecords: PrayerRecord[]; settings: AppSettings } {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.plans) || !Array.isArray(value.prayerRecords) || !isRecord(value.settings)) return false
  if (!value.plans.every(isPlan) || !value.prayerRecords.every(isPrayerRecord)) return false
  const plans = value.plans as PrayerPlan[]
  const records = value.prayerRecords as PrayerRecord[]
  const planIds = new Set(plans.map((plan) => plan.id))
  const recordIds = new Set(records.map((record) => record.id))
  if (planIds.size !== plans.length || recordIds.size !== records.length || records.some((record) => !planIds.has(record.planId))) return false
  const settings = value.settings
  return (settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system') &&
    settings.language === 'ar' &&
    (settings.activePlanId === null || (typeof settings.activePlanId === 'string' && planIds.has(settings.activePlanId)))
}
