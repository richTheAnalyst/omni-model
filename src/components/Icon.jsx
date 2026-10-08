const PATHS = {
  home: <path d="M3.5 11 12 4l8.5 7M5.5 9.8V20h4.5v-5.5h4V20h4.5V9.8" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  list: <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4 6.5h.01M4 12h.01M4 17.5h.01" />,
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  back: <path d="M19 12H5m5-5-5 5 5 5" />,
  external: <path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />,
  phone: (
    <path d="M6.6 4h2.7l1.4 3.6-1.8 1.2a10 10 0 0 0 4.3 4.3l1.2-1.8L20 12.7v2.7a1.6 1.6 0 0 1-1.7 1.6A14.4 14.4 0 0 1 5 5.7 1.6 1.6 0 0 1 6.6 4Z" />
  ),
  star: <path d="m12 4.5 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.8l5-.7Z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 4.5 21 19.5H3Z" />
      <path d="M12 10v4.2M12 16.9h.01" />
    </>
  ),
  x: <path d="m6 6 12 12M18 6 6 18" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  download: <path d="M12 4.5v10m-4.5-4.5L12 14.5l4.5-4.5M5 19.5h14" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  refresh: <path d="M19 6v4.5h-4.5M5 18v-4.5h4.5M6.2 9.5A7 7 0 0 1 18.6 8.8L19 10.5M17.8 14.5a7 7 0 0 1-12.4.7L5 13.5" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.5 3.6 5.3 3.6 8.5s-1.2 6-3.6 8.5c-2.4-2.5-3.6-5.3-3.6-8.5S9.600 6 12 3.500Z" />
    </>
  ),
  block: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </>
  ),
  pen: <path d="m5 19 .8-3.6L15.6 5.6a1.8 1.8 0 0 1 2.6 0l.2.2a1.8 1.8 0 0 1 0 2.6L8.600 18.200Z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  trash: <path d="M5 7h14M10 7V5h4v2m-7 0 .8 12h8.400L17 7M10.500 11v5M13.500 11v5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
}

export default function Icon({ name, size = 18, className = '', title }) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      aria-label={title}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}

export function Logo({ size = 28 }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <circle
        cx="16"
        cy="16"
        r="9"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="42 14.5"
        transform="rotate(-60 16 16)"
      />
      <circle cx="16" cy="16" r="3.2" fill="#9fb0ff" />
    </svg>
  )
}
