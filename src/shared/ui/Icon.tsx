export function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-6v2m0 15v2m9-9h-2m-14 0H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64',
    plus: 'M12 5v14m-7-7h14',
    close: 'M18 6 6 18M6 6l12 12',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3',
    arrow: 'M5 12h14m-7-7 7 7-7 7',
    sun: 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    moon: 'M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z',
    home: 'm3 10 9-7 9 7m-2-1v11H5V9m5 11v-6h4v6',
    plan: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21Zm0 0v13A2.5 2.5 0 0 1 6.5 16H20',
    history: 'M3 12a9 9 0 1 0 2.64-6.36L3 8m0-5v5h5m4-1v5l3 2',
    stats: 'M4 20V9m5 11V4m5 16v-7m5 7V7',
    edit: 'm16 4 4 4M5 19l4-.8L20 7a2.12 2.12 0 0 0-3-3L6 15l-1 4Z',
    delete: 'M3 6h18m-2 0-1 14H6L5 6m4 0V4h6v2m-5 4v7m4-7v7',
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="icon"><path d={paths[name] ?? paths.arrow} /></svg>
}
