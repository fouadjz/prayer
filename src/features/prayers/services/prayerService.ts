import type { PrayerRecord, PrayerType } from '../../../shared/types/domain'
import type { PrayerRepository } from '../../../infrastructure/storage/repository'

export async function recordPrayers(repository: PrayerRepository, planId: string, prayerTypes: PrayerType[], completedAt = new Date().toISOString()) {
  const createdAt = new Date().toISOString()
  const records = prayerTypes.map((prayerType) => ({
    id: crypto.randomUUID(),
    planId,
    prayerType,
    completedAt,
    createdAt,
  }))
  await repository.addMany(records)
  return records
}

export async function undoPrayerRecords(repository: PrayerRepository, records: PrayerRecord[]) {
  await repository.deleteMany(records.map((record) => record.id))
}
