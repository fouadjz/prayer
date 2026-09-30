import type { AppSettings, PrayerPlan, PrayerRecord } from '../../shared/types/domain'

const DATABASE_NAME = 'fatatni-salat'
const DATABASE_VERSION = 1
const DEFAULT_SETTINGS: AppSettings = { theme: 'system', language: 'ar', activePlanId: null }

export interface PlanRepository {
  getAll(): Promise<PrayerPlan[]>
  getById(id: string): Promise<PrayerPlan | null>
  add(plan: PrayerPlan, settings: AppSettings): Promise<void>
  update(plan: PrayerPlan): Promise<void>
  delete(id: string, settings: AppSettings): Promise<void>
}

export interface PrayerRepository {
  getAll(planId?: string): Promise<PrayerRecord[]>
  getById(id: string): Promise<PrayerRecord | null>
  addMany(records: PrayerRecord[]): Promise<void>
  update(record: PrayerRecord): Promise<void>
  delete(id: string): Promise<void>
  deleteMany(ids: string[]): Promise<void>
}

export interface SettingsRepository {
  get(): Promise<AppSettings>
  save(settings: AppSettings): Promise<void>
}

export interface AppRepository {
  plans: PlanRepository
  prayers: PrayerRepository
  settings: SettingsRepository
  replaceAll(plans: PrayerPlan[], records: PrayerRecord[], settings: AppSettings): Promise<void>
  clear(): Promise<void>
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('plans')) db.createObjectStore('plans', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('prayers')) {
        const prayers = db.createObjectStore('prayers', { keyPath: 'id' })
        prayers.createIndex('planId', 'planId', { unique: false })
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('تعذر فتح قاعدة البيانات المحلية.'))
    request.onblocked = () => reject(new Error('قاعدة البيانات مشغولة في نافذة أخرى. أغلق النوافذ الأخرى ثم أعد المحاولة.'))
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('تعذر تنفيذ العملية على البيانات المحلية.'))
  })
}

async function readAll<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase()
  try {
    const tx = db.transaction(storeName, 'readonly')
    return await requestResult(tx.objectStore(storeName).getAll()) as T[]
  } finally { db.close() }
}

async function readById<T>(storeName: string, id: string): Promise<T | null> {
  const db = await openDatabase()
  try {
    const result = await requestResult(db.transaction(storeName, 'readonly').objectStore(storeName).get(id)) as T | undefined
    return result ?? null
  } finally { db.close() }
}

async function readPrayerRecords(planId?: string): Promise<PrayerRecord[]> {
  if (!planId) return readAll<PrayerRecord>('prayers')
  const db = await openDatabase()
  try {
    const tx = db.transaction('prayers', 'readonly')
    return await requestResult(tx.objectStore('prayers').index('planId').getAll(IDBKeyRange.only(planId)))
  } finally { db.close() }
}

async function write(storeName: string, operation: 'put' | 'add' | 'delete' | 'clear', value?: unknown): Promise<void> {
  const db = await openDatabase()
  try {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    if (operation === 'delete') store.delete(value as IDBValidKey)
    else if (operation === 'clear') store.clear()
    else if (operation === 'add') store.add(value)
    else store.put(value)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('تعذر حفظ البيانات المحلية.'))
    })
  } finally { db.close() }
}

async function writeMany(storeName: string, values: unknown[]): Promise<void> {
  const db = await openDatabase()
  try {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    values.forEach((value) => store.put(value))
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('تعذر حفظ البيانات المحلية.'))
    })
  } finally { db.close() }
}

export const repository: AppRepository = {
  plans: {
    getAll: () => readAll<PrayerPlan>('plans'),
    getById: (id: string) => readById<PrayerPlan>('plans', id),
    add: async (plan: PrayerPlan, settings: AppSettings) => {
      const db = await openDatabase()
      try {
        const tx = db.transaction(['plans', 'settings'], 'readwrite')
        tx.objectStore('plans').add(plan)
        tx.objectStore('settings').put({ key: 'app', value: settings })
        await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('تعذر إنشاء الخطة.')) })
      } finally { db.close() }
    },
    update: (plan: PrayerPlan) => write('plans', 'put', plan),
    delete: async (id: string, settings: AppSettings) => {
      const db = await openDatabase()
      try {
        const tx = db.transaction(['plans', 'prayers', 'settings'], 'readwrite')
        tx.objectStore('plans').delete(id)
        tx.objectStore('settings').put({ key: 'app', value: settings })
        const prayerStore = tx.objectStore('prayers')
        const index = prayerStore.index('planId')
        const request = index.openKeyCursor(IDBKeyRange.only(id))
        request.onsuccess = () => { const cursor = request.result; if (cursor) { prayerStore.delete(cursor.primaryKey); cursor.continue() } }
        await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('تعذر حذف الخطة وتسجيلاتها.')) })
      } finally { db.close() }
    },
  },
  prayers: {
    getAll: readPrayerRecords,
    getById: (id: string) => readById<PrayerRecord>('prayers', id),
    addMany: (records: PrayerRecord[]) => writeMany('prayers', records),
    update: (record: PrayerRecord) => write('prayers', 'put', record),
    delete: (id: string) => write('prayers', 'delete', id),
    deleteMany: async (ids: string[]) => {
      const db = await openDatabase()
      try {
        const tx = db.transaction('prayers', 'readwrite')
        const store = tx.objectStore('prayers')
        ids.forEach((id) => store.delete(id))
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('تعذر التراجع عن التسجيلات.'))
        })
      } finally { db.close() }
    },
  },
  settings: {
    get: async () => {
      const db = await openDatabase()
      try {
        const result = await requestResult(db.transaction('settings', 'readonly').objectStore('settings').get('app')) as { key: string; value: AppSettings } | undefined
        return result?.value ?? DEFAULT_SETTINGS
      } finally { db.close() }
    },
    save: (value: AppSettings) => write('settings', 'put', { key: 'app', value }),
  },
  replaceAll: async (plans: PrayerPlan[], records: PrayerRecord[], settings: AppSettings) => {
    const db = await openDatabase()
    try {
      const tx = db.transaction(['plans', 'prayers', 'settings'], 'readwrite')
      const planStore = tx.objectStore('plans')
      const prayerStore = tx.objectStore('prayers')
      const settingsStore = tx.objectStore('settings')
      planStore.clear()
      prayerStore.clear()
      settingsStore.clear()
      plans.forEach((plan) => planStore.put(plan))
      records.forEach((record) => prayerStore.put(record))
      settingsStore.put({ key: 'app', value: settings })
      await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('تعذر استيراد البيانات.')) })
    } finally { db.close() }
  },
  clear: async () => {
    const db = await openDatabase()
    try {
      const tx = db.transaction(['plans', 'prayers', 'settings'], 'readwrite')
      tx.objectStore('plans').clear()
      tx.objectStore('prayers').clear()
      tx.objectStore('settings').clear()
      await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('تعذر حذف البيانات.')) })
    } finally { db.close() }
  },
}
