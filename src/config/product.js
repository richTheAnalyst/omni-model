// Product identity and hard-coded UI copy. None of this comes from the API.

export const PRODUCT = {
  name: 'Omni Model',
  tagline: 'Find the right businesses. Understand the opportunity. Start the conversation.',
  // Requested designation. Kept here as the single source of truth; not shown in the UI.
  designation: '2000 GSX',
}

export const COPY = {
  hero: {
    title: 'Find the businesses that matter.',
    body: 'Omni Model helps businesses discover relevant companies, evaluate their fit, analyze their online presence, and create targeted outreach.',
    primary: 'Find Leads',
    secondary: 'Explore the Platform',
  },
  loading: {
    startup: 'Starting Omni Model…',
    search: 'Finding companies…',
    analysis: 'Analyzing website…',
    outreach: 'Preparing outreach…',
    export: 'Preparing your file…',
  },
  review: 'Review before sending.',
  reviewDetail: 'Omni Model prepares drafts. It never sends email for you.',
  dncNote: 'Saved on this device only. Omni Model’s server does not enforce this, so keep your own records up to date too.',
}

export const WORKFLOW = [
  { title: 'Define your market', body: 'Pick a country, region, city and industry.' },
  { title: 'Find companies', body: 'Omni Model searches for matching companies and scores each one per offering.' },
  { title: 'Evaluate the opportunity', body: 'See the best-fit offering and the factors behind every score.' },
  { title: 'Analyze the website', body: 'Read the company’s own site for hiring, growth and provider signals.' },
  { title: 'Create outreach', body: 'Draft an email, proposal or follow-up for the offering that fits.' },
  { title: 'Edit and export', body: 'Refine the draft, then copy it or export it as PDF, Word or text.' },
]

export const OUTREACH_KINDS = [
  {
    id: 'email',
    label: 'Email',
    cta: 'Generate Email',
    slug: 'email',
    empty: 'A short introduction written for this company and the offering you choose.',
  },
  {
    id: 'proposal',
    label: 'Proposal',
    cta: 'Generate Proposal',
    slug: 'proposal',
    empty: 'A fuller proposal letter that sets out how the offering fits this company.',
  },
  {
    id: 'followup',
    label: 'Follow-up',
    cta: 'Generate Follow-up',
    slug: 'followup',
    empty: 'A polite follow-up for a company you have already contacted.',
  },
]

export const EXPORT_FORMATS = [
  { id: 'pdf', label: 'Export as PDF' },
  { id: 'docx', label: 'Export as Word' },
  { id: 'txt', label: 'Export as Text' },
]

// Product copy for the score bands (rules come from the API guide).
export const SCORE_BANDS = [
  {
    key: 'strong',
    min: 70,
    label: 'Strong fit',
    short: 'Strong',
    tone: 'good',
    range: '70–100',
    meaning: 'A close match for what you sell. Worth contacting first.',
  },
  {
    key: 'potential',
    min: 40,
    label: 'Potential fit',
    short: 'Potential',
    tone: 'warn',
    range: '40–69',
    meaning: 'Some signs of fit. Analyze the website to firm up the picture.',
  },
  {
    key: 'low',
    min: 0,
    label: 'Low fit',
    short: 'Low',
    tone: 'bad',
    range: '0–39',
    meaning: 'Few signs of fit. Likely not worth your time yet.',
  },
]

export const SCORE_EXPLAINER =
  'The score estimates how well a company matches one of your offerings, from 0 to 100. Before analysis it rests on the industry, how many companies were found nearby and review volume. Analyzing the website adds what the company says about itself.'

// Wording for score factors. Keys come from the API; unknown keys fall back to a tidy label.
export const FACTOR_COPY = {
  offering_fit: { label: 'Offering fit', hint: 'How well this offering suits this kind of company.' },
  sector_priority: { label: 'Industry priority', hint: 'How highly this industry ranks for your business.' },
  size: { label: 'Company size', hint: 'Signs of how large the company is.' },
  footprint: { label: 'Footprint', hint: 'Signs of how many sites or how much ground it covers.' },
  cluster: { label: 'Nearby cluster', hint: 'How many similar companies were found close by.' },
  buying_signals: {
    label: 'Buying signals',
    hint: 'Evidence of near-term need, such as hiring or growth. Mostly appears after website analysis.',
  },
}

export const SIGNAL_COPY = {
  company_name: 'Name on website',
  hiring: 'Hiring',
  growth_signals: 'Growth signals',
  site_count: 'Sites',
  size_estimate: 'Size estimate',
  existing_provider: 'Existing provider',
}

export const NAV = [
  {
    group: 'Workspace',
    items: [
      { to: '/', label: 'Home', short: 'Home', icon: 'home', end: true },
      { to: '/find', label: 'Find Leads', short: 'Find', icon: 'search' },
      { to: '/leads', label: 'Leads', short: 'Leads', icon: 'list' },
      { to: '/outreach', label: 'Outreach', short: 'Outreach', icon: 'mail' },
    ],
  },
  {
    group: 'History',
    items: [{ to: '/activity', label: 'Activity', short: 'Activity', icon: 'clock' }],
  },
  {
    group: null,
    items: [{ to: '/settings', label: 'Settings', short: 'Settings', icon: 'settings' }],
  },
]
