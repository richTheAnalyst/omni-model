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

// Default offerings (fallback when user hasn't entered services yet)
const DEFAULT_OFFERINGS = {
  guarding: { label: 'Manned Guarding', description: 'On-site security guards' },
  k9: { label: 'Canine K9 Security', description: 'Handler and dog patrol teams' },
}

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
  buying_signal_keywords: [
    'hiring security',
    'guards',
    'expanding',
    'new site',
    'new branch',
  ],
  signal_schema: {
    company_name: 'The exact company name as it appears on the website.',
    hiring: 'Job titles the company is hiring for, especially security, guard or operations roles.',
    growth_signals: 'Signs of growth such as expansions, new sites, new branches or new projects.',
    site_count: 'The number of locations, branches or sites mentioned.',
    size_estimate: 'An estimate of how many staff or guards the company employs.',
    existing_provider: 'Any security provider already named on the website.',
  },
  outreach: {
    email: `Subject: {offering_label} for {company} in {city}\n\nDear {company} team,\n\nI'm {our_title} at {our_name}. We provide {offering_label} to companies in {city}, and {company} stood out as a strong fit for the service.\n\nCould we set up a brief call this week to talk about your security needs? You can reach me directly at {our_email} or {our_phone}.\n\nBest regards,\n{our_title}\n{our_name}`,
    proposal: `Proposal: {offering_label} for {company}\n\nPrepared for {company}, {city}\n\nThank you for the opportunity to propose {offering_label} for {company}. {our_name} delivers {offering_label} tailored to your premises, staff and schedule in {city}.\n\nWhat's included:\n- A site assessment of your {city} premises\n- A {offering_label} plan fitted to your team and hours\n- Clear pricing and a dedicated account contact\n\nTo accept or discuss adjustments, contact {our_name} at {our_email} or {our_phone}.\n\nSincerely,\n{our_title}\n{our_name}`,
    followup: `Following up: {offering_label} for {company}\n\nDear {company} team,\n\nI'm following up on my note about {offering_label} for {company} in {city}. If now isn't the right time, a quick reply is just as helpful.\n\nYou can reach {our_name} at {our_email} or {our_phone}.\n\nBest regards,\n{our_title}`,
  },
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
  if (servicesString?.trim()) {
    return buildOfferingsFromServices(servicesString)
  }
  const out = {}
  for (const [key, value] of Object.entries(profile?.offerings || {})) {
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