import { describe, expect, it, vi } from 'vitest'
import type { PrayerRepository } from '../../../infrastructure/storage/repository'
import { recordPrayers, undoPrayerRecords } from './prayerService'

describe('prayer recording service', () => {
  it('persists all requested records and returns their generated IDs', async () => {
    const addMany = vi.fn<PrayerRepository['addMany']>().mockResolvedValue(undefined)
    const repository: PrayerRepository = { getAll: async () => [], getById: async () => null, addMany, update: async () => {}, delete: async () => {}, deleteMany: async () => {} }
    const created = await recordPrayers(repository, 'plan-1', ['fajr', 'isha'], '2026-09-30T08:30:00.000Z')
    expect(addMany).toHaveBeenCalledOnce()
    expect(addMany).toHaveBeenCalledWith(created)
    expect(created).toHaveLength(2)
    expect(new Set(created.map((record) => record.id)).size).toBe(2)
    expect(created.every((record) => record.planId === 'plan-1' && record.createdAt)).toBe(true)
  })

  it('undoes a group of records in one repository operation', async () => {
    const deleteMany = vi.fn<PrayerRepository['deleteMany']>().mockResolvedValue(undefined)
    const repository: PrayerRepository = { getAll: async () => [], getById: async () => null, addMany: async () => {}, update: async () => {}, delete: async () => {}, deleteMany }
    await undoPrayerRecords(repository, [
      { id: 'one', planId: 'plan', prayerType: 'fajr', completedAt: '2026-09-30T00:00:00.000Z' },
      { id: 'two', planId: 'plan', prayerType: 'isha', completedAt: '2026-09-30T00:00:00.000Z' },
    ])
    expect(deleteMany).toHaveBeenCalledWith(['one', 'two'])
  })
})
