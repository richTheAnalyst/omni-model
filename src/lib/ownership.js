// Ownership helpers
export const ownershipOf = (l = {}) => l.ownership ?? 'non_government'

export const filterLeads = (leads = [], filter = 'all') => {
  if (filter === 'all') return leads
  return leads.filter((l) => (filter === 'government') === (ownershipOf(l) === 'government'))
}

export const countByOwnership = (leads = []) => ({
  all: leads.length,
  government: leads.filter((l) => ownershipOf(l) === 'government').length,
  non_government: leads.filter((l) => ownershipOf(l) !== 'government').length,
})

export const badgeText = (l = {}) => {
  const gov = ownershipOf(l) === 'government'
  const label = gov ? 'Government' : 'Non-government'
  const conf = l.ownership_confidence
  if (conf === 'ai') return `${label} · AI-checked`
  if (conf === 'assumed' || !conf) return `${label} · not verified`
  return label // high
}

export const mergeOwnership = (lead = {}, res = {}) => {
  if (res.ownership_confidence === 'assumed') return lead
  const { ownership, ownership_confidence, ownership_source, ownership_reason } = res
  return {
    ...lead,
    ownership,
    ownership_confidence,
    ownership_source,
    ownership_reason,
  }
}
