import { COUNTRIES, citiesOf, INDUSTRIES, regionsOf } from './markets.js'

// The API validates region and sector against the profile we send, so the
// profile's geography and sectors are generated from markets.js — add a
// region, city or industry there and it is accepted everywhere.
const geography = {}
for (const country of COUNTRIES) {
  for (const region of country.regions) {
    geography[region.name] = region.cities
  }
}

const sectors = Object.fromEntries(
  INDUSTRIES.map((industry) => [
    industry.value,
    { label: industry.label, query: industry.label, priority: 1, fit: {} },
  ]),
)

// Neutral starter values. Nothing here is specific to one industry: every business replaces these in Settings.
// Default offering (used only until the person types the service they sell in Settings).
const DEFAULT_OFFERINGS = {
  your_service: { label: 'Your service', description: 'the service you offer' },
}

/** The three outreach drafts a business starts from. Placeholders in {braces} are filled in for each company. */
export const DEFAULT_OUTREACH = {
  email: `Subject: {offering_label} for {company} in {city}\n\nDear {company} team,\n\nI'm {our_title} at {our_name}. We provide {offering_label} to companies in {city}, and {company} looks like a good match for it.\n\nCould we set up a brief call this week to talk? You can reach me directly at {our_email} or {our_phone}.\n\nBest regards,\n{our_title}\n{our_name}`,
  proposal: `Proposal: {offering_label} for {company}\n\nPrepared for {company}, {city}\n\nThank you for the opportunity to propose {offering_label} for {company}. {our_name} delivers {offering_label}, fitted to your needs in {city}.\n\nWhat's included:\n- A first meeting to understand what you need\n- A {offering_label} plan built around your business\n- Clear pricing and a dedicated account contact\n\nTo accept or discuss changes, contact {our_name} at {our_email} or {our_phone}.\n\nSincerely,\n{our_title}\n{our_name}`,
  followup: `Following up: {offering_label} for {company}\n\nDear {company} team,\n\nI'm following up on my note about {offering_label} for {company} in {city}. If now isn't the right time, a quick reply is just as helpful.\n\nYou can reach {our_name} at {our_email} or {our_phone}.\n\nBest regards,\n{our_title}`,
}

/** What the template placeholders mean, shown in Settings. */
export const TEMPLATE_PLACEHOLDERS = [
  'company', 'city', 'offering_label', 'offering_desc', 'local_context', 'our_name', 'our_title', 'our_email', 'our_phone',
]
export const MAX_TEMPLATE_CHARS = 5000 // the server refuses longer ones

export const PROFILE = {
  id: 'workspace',
  name: 'Workspace profile',
  country: 'Ghana',
  business: {
    our_name: '',
    our_title: '',
    our_email: '',
    our_phone: '',
  },
  offerings: DEFAULT_OFFERINGS,
  sectors,
  geography,
  weights: {
    offering_fit: 1,
    sector_priority: 1,
    size: 1,
    footprint: 1,
    cluster: 1,
    buying_signals: 1,
  },
  // Empty until the business says which words in job ads show it is needed (Settings > How you sell).
  buying_signal_keywords: [],
  signal_schema: {
    company_name: 'The exact company name as it appears on the website.',
    hiring: 'Job titles the company is hiring for, especially roles related to what we sell.',
    growth_signals: 'Signs of growth such as expansions, new sites, new branches or new projects.',
    site_count: 'The number of locations, branches or sites mentioned.',
    size_estimate: 'An estimate of how many staff the company employs.',
    existing_provider: 'Any current supplier of this kind of service already named on the website.',
  },
  outreach: DEFAULT_OUTREACH,
}

/** Build offerings object from comma-separated services string (e.g. "Manned Guarding, K9 Security") */
export function buildOfferingsFromServices(servicesString) {
  if (!servicesString?.trim()) return {}
  return servicesString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .reduce((acc, service) => {
      const key = service.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      acc[key] = { label: service, description: service }
      return acc
    }, {})
}

/** Get offering labels from services string (Settings) or fall back to profile defaults */
export function offeringLabels(profile = PROFILE, servicesString) {
  const source = servicesString?.trim()
    ? buildOfferingsFromServices(servicesString)
    : profile?.offerings || {}
  const out = {}
  for (const [key, value] of Object.entries(source)) {
    out[key] = typeof value === 'string' ? value : value?.label || key
  }
  return out
}

export function sectorOptions(profile = PROFILE) {
  const fromProfile = Object.entries(profile?.sectors || {}).map(([key, value]) => ({
    value: key,
    label: typeof value === 'string' ? value : value?.label || key,
  }))
  return fromProfile.length
    ? fromProfile
    : INDUSTRIES.map((i) => ({ value: i.value, label: i.label }))
}

export function profileWithSector(baseProfile, sectorLabel, sectorKey) {
  if (!sectorLabel || !baseProfile) return baseProfile
  const key = sectorKey || normalizeSector(sectorLabel)
  if (baseProfile.sectors[key]) return baseProfile
  return {
    ...baseProfile,
    sectors: {
      ...baseProfile.sectors,
      [key]: { label: sectorLabel, query: sectorLabel, priority: 1, fit: {} },
    },
  }
}

export function regionOptions(profile = PROFILE, country) {
  const fromProfile = Object.keys(profile?.geography || {})
  if (fromProfile.length) return fromProfile.map((name) => ({ value: name, label: name }))
  return regionsOf(country).map((r) => ({ value: r.name, label: r.name }))
}

export function cityOptions(profile = PROFILE, country, region) {
  const fromProfile = profile?.geography?.[region]
  if (Array.isArray(fromProfile) && fromProfile.length) {
    return fromProfile.map((name) => ({ value: name, label: name }))
  }
  return citiesOf(country, region).map((name) => ({ value: name, label: name }))
}

/** Turns "it support, helpdesk; network" into ['it support', 'helpdesk', 'network']. Lowercase, no repeats, short. */
export function parseSignalWords(text) {
  const out = []
  for (const raw of String(text || '').split(/[,;\n]/)) {
    const word = raw.trim().toLowerCase().slice(0, 40)
    if (word && !out.includes(word)) out.push(word)
  }
  return out.slice(0, 30)
}

/** The {placeholders} in a template that the server will not fill in (they would print as they are). */
export function unknownPlaceholders(template) {
  const found = new Set()
  for (const m of String(template || '').matchAll(/\{(\w+)\}/g)) {
    if (!TEMPLATE_PLACEHOLDERS.includes(m[1])) found.add(m[1])
  }
  return [...found]
}

/**
 * The profile that is sent with a search, an analysis or an outreach draft: the base profile with this business's own
 * services, buying-signal words, competitor wording, outreach templates and AI fit ratings applied.
 * Anything left empty keeps the neutral default, so a half-filled Settings page still works.
 */
export function buildRequestProfile(base, { business, playbook, fitScores } = {}) {
  const dynamicOfferings = buildOfferingsFromServices(business?.service)
  const offerings = Object.keys(dynamicOfferings).length ? dynamicOfferings : base.offerings

  // AI fit ratings: sector -> service -> 0..1. Only ratings for services that exist now are kept.
  const sectors = { ...base.sectors }
  for (const [sectorKey, ratings] of Object.entries(fitScores || {})) {
    if (!sectors[sectorKey] || !ratings || typeof ratings !== 'object') continue
    const fit = { ...(sectors[sectorKey].fit || {}) }
    for (const [offeringKey, value] of Object.entries(ratings)) {
      if (offeringKey in offerings && Number.isFinite(Number(value))) fit[offeringKey] = Number(value)
    }
    sectors[sectorKey] = { ...sectors[sectorKey], fit }
  }

  const words = parseSignalWords(playbook?.signal_words)
  const kind = String(playbook?.competitor_kind || '').trim().slice(0, 120)
  const signal_schema = { ...base.signal_schema }
  if (words.length) {
    signal_schema.hiring = `Job titles the company is hiring for, especially any related to: ${words.join(', ')}.`
  }
  if (kind) signal_schema.existing_provider = `Any mention of a current ${kind}, otherwise null.`

  const outreach = { ...base.outreach }
  for (const k of ['email', 'proposal', 'followup']) {
    const own = String(playbook?.[k] || '').trim()
    if (own) outreach[k] = own.slice(0, MAX_TEMPLATE_CHARS)
  }

  return {
    ...base,
    offerings,
    sectors,
    signal_schema,
    outreach,
    buying_signal_keywords: words.length ? words : base.buying_signal_keywords || [],
  }
}