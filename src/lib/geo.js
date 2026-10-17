// Links to Google Earth and Google Maps, and a KML export for opening many leads at once in Google Earth.

const enc = encodeURIComponent
const hasCoords = (l) => Number.isFinite(l?.lat) && Number.isFinite(l?.lng)
const placeText = (l) => [l?.name, l?.address].filter(Boolean).join(', ')
const isPlaceId = (id) => typeof id === 'string' && id.startsWith('ChIJ')

/** Opens Google Earth (web) looking at the place. */
export function earthUrl(lead) {
  if (hasCoords(lead)) return `https://earth.google.com/web/@${lead.lat},${lead.lng},0a,600d,35y,0h,0t,0r`
  return `https://earth.google.com/web/search/${enc(placeText(lead))}`
}

/** Opens Google Maps with directions to the place. With no origin, Google uses the visitor's own location. */
export function directionsUrl(lead) {
  const destination = hasCoords(lead) ? `${lead.lat},${lead.lng}` : placeText(lead)
  const placeId = isPlaceId(lead?.id) ? `&destination_place_id=${enc(lead.id)}` : ''
  return `https://www.google.com/maps/dir/?api=1&destination=${enc(destination)}${placeId}&travelmode=driving`
}

/** Opens the place on Google Maps. */
export function mapsUrl(lead) {
  const query = hasCoords(lead) ? `${lead.lat},${lead.lng}` : placeText(lead)
  const placeId = isPlaceId(lead?.id) ? `&query_place_id=${enc(lead.id)}` : ''
  return `https://www.google.com/maps/search/?api=1&query=${enc(query)}${placeId}`
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function describe(lead) {
  const best = lead.scores?.[lead.best_offering]
  const parts = [
    lead.address,
    lead.phone ? `Phone: ${lead.phone}` : '',
    lead.website ? `Website: ${lead.website}` : '',
    lead.ownership === 'government' ? 'Government / public sector' : 'Non-government',
    best ? `Best fit: ${best.label} (${Math.round((Number(best.score) || 0) * 100)})` : '',
  ]
  return parts.filter(Boolean).join(' | ')
}

/** Builds a KML file (Google Earth's format). Leads without coordinates are skipped and counted. */
export function leadsToKml(leads, title = 'Leads') {
  const placed = leads.filter(hasCoords)
  const marks = placed
    .map(
      (l) =>
        `    <Placemark>\n      <name>${esc(l.name || 'Unnamed')}</name>\n      <description>${esc(describe(l))}</description>\n      <Point><coordinates>${l.lng},${l.lat},0</coordinates></Point>\n    </Placemark>`,
    )
    .join('\n')
  const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>${esc(title)}</name>\n${marks}\n  </Document>\n</kml>\n`
  return { kml, count: placed.length, skipped: leads.length - placed.length }
}

export function downloadText(filename, text, mime = 'application/vnd.google-earth.kml+xml') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}