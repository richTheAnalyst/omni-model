import { offeringLabels } from '../config/profile.js'

/** Which offering to write about for a lead: the service typed in Settings, else the lead's best fit, else the first one. */
export function pickOffering(profile, business, lead) {
  const labels = Object.keys(profile?.offerings || {}).length
    ? offeringLabels(profile, business?.service)
    : Object.fromEntries(Object.entries(lead?.scores || {}).map(([k, v]) => [k, v?.label || k]))
  const keys = Object.keys(labels)
  const text = String(business?.service || '').trim().toLowerCase()
  const matched = text
    ? keys.find((k) => {
        const label = String(labels[k]).toLowerCase()
        return label.includes(text) || text.includes(label)
      })
    : undefined
  return matched || (keys.includes(lead?.best_offering) ? lead.best_offering : keys[0]) || lead?.best_offering || ''
}