import { describe, expect, it } from 'vitest'
import {
  calculateCompleted,
  calculateDailyProgress,
  calculatePeriodProgress,
  calculateProgress,
  calculateRemaining,
  groupByPrayerType,
  hasPrayerOnDay,
  isValidBackup,
  validatePlan,
  type PrayerRecord,
} from './domain'

const records: PrayerRecord[] = [
  { id: 'a', planId: 'plan', prayerType: 'fajr', completedAt: '2026-09-30T06:00:00.000Z' },
  { id: 'b', planId: 'plan', prayerType: 'fajr', completedAt: '2026-09-29T06:00:00.000Z' },
  { id: 'c', planId: 'plan', prayerType: 'isha', completedAt: '2026-09-30T20:00:00.000Z' },
]

describe('prayer progress calculations', () => {
  it('calculates completed, remaining, and clamped progress', () => {
    expect(calculateCompleted(records)).toBe(3)
    expect(calculateRemaining(10, 12)).toBe(0)
    expect(calculateProgress(3, 10)).toBe(0.3)
    expect(calculateProgress(5, 0)).toBe(0)
    expect(calculateProgress(-1, 10)).toBe(0)
  })

  it('counts records for the local day and selected week/month', () => {
    const now = new Date('2026-09-30T12:00:00.000Z')
    expect(calculateDailyProgress(records, now)).toBe(1)
    expect(calculatePeriodProgress(records, 'week', now)).toBe(2)
    expect(calculatePeriodProgress(records, 'month', now)).toBe(2)
    expect(hasPrayerOnDay(records, 'fajr', now)).toBe(true)
  })

  it('groups records by prayer type', () => {
    expect(groupByPrayerType(records)).toEqual({ fajr: 2, dhuhr: 0, asr: 0, maghrib: 0, isha: 1 })
  })
})

describe('plan and backup validation', () => {
  it('rejects invalid targets and dates', () => {
    expect(validatePlan('الخطة', 10, 11)).toContain('الهدف اليومي')
    expect(validatePlan('الخطة', 10, 1, '2026-02-31')).toContain('تاريخ')
    expect(validatePlan('', 10, 1)).toContain('اسم')
    expect(validatePlan('الخطة', 10, 1, '2026-09-30')).toBeNull()
  })

  it('validates a complete backup and rejects orphaned or duplicate records', () => {
    const backup = {
      version: 1,
      plans: [{ id: 'plan', name: 'الخطة', totalPrayers: 10, dailyTarget: 2, startDate: '2026-09-30', createdAt: '2026-09-30T10:00:00.000Z' }],
      prayerRecords: records.slice(0, 1),
      settings: { theme: 'system', language: 'ar', activePlanId: 'plan' },
    }
    expect(isValidBackup(backup)).toBe(true)
    expect(isValidBackup({ ...backup, prayerRecords: [{ ...records[0], planId: 'missing' }] })).toBe(false)
    expect(isValidBackup({ ...backup, prayerRecords: [records[0], records[0]] })).toBe(false)
  })
})
