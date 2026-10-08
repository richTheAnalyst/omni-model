// DEV-ONLY mock of the Omni Model Lead API, for testing the UI without the real
// server or key. Not imported by the app. Run: npm run mock-api
// Point the app at it with VITE_API_URL=http://localhost:8787 VITE_API_KEY=mock-key
// Test hooks: a website containing "fail" returns 502, "nojson" returns a warning.
import http from 'node:http'

const KEY = 'mock-key'
const PORT = 8787
const mk = (i, g, k) => ({
  guarding: { label: 'Manned Guarding', score: g, breakdown: { offering_fit: 30, sector_priority: 20, size: 3.8, footprint: 1.2, cluster: 3, buying_signals: 0 } },
  k9: { label: 'Canine K9 Security', score: k, breakdown: { offering_fit: 20, sector_priority: 20, size: 3.8, footprint: 1.2, cluster: 3, buying_signals: 0 } },
})
const leads = (city, sector, region, n) => Array.from({ length: n }, (_, i) => ({
  id: `place-${city}-${sector}-${i}`.toLowerCase(), name: i === 3 ? null : `Mock ${sector} company ${i + 1}`,
  address: `${i + 10} Test Road, ${city}`, phone: i === 1 ? null : `030 200 00${i}${i}`,
  website: i === 2 ? null : i === 4 ? 'https://fail.example.com' : i === 5 ? 'https://nojson.example.com' : `https://mock${i}.example.com`,
  rating: i === 1 ? null : 4.1 - i * 0.1, review_count: i === 1 ? null : 50 - i, region, city, sector,
  best_offering: i % 2 ? 'k9' : 'guarding', scores: mk(i, 0.78 - i * 0.09, 0.6 - i * 0.07),
}))
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-API-Key, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '')
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/health') { await sleep(Number(process.env.WAKE_MS || 0)); return send(res, 200, { status: 'ok' }) }
  if (req.headers['x-api-key'] !== KEY) return send(res, 401, { detail: 'Invalid API key' })
  if (url.pathname === '/backends') return send(res, 200, { backends: ['ollama', 'openrouter'] })
  let raw = ''
  for await (const c of req) raw += c
  const body = raw ? JSON.parse(raw) : {}
  if (url.pathname === '/search') {
    if (!body.city) return send(res, 422, { detail: 'city is required' })
    if (String(body.city).includes('Takoradi')) return send(res, 502, { detail: 'Places lookup failed' })
    const list = leads(body.city, body.sector, body.region, Math.min(body.max_results || 10, 8))
    return send(res, 200, { profile: body.profile, count: list.length, leads: list })
  }
  if (url.pathname === '/analyze') {
    await sleep(Number(process.env.ANALYZE_MS || 1500))
    if (body.url.includes('fail')) return send(res, 502, { detail: 'Could not read the website' })
    const warn = body.url.includes('nojson')
    return send(res, 200, {
      url: body.url, best_offering: 'k9',
      signals: warn ? {} : { company_name: body.name, hiring: ['Security Guard', 'Supervisor'], growth_signals: ['New pit opening'], site_count: 4, size_estimate: null, existing_provider: 'Incumbent Security Ltd', extra_flag: true },
      scores: mk(0, warn ? 0.7 : 0.62, warn ? 0.55 : 0.81),
      ...(warn ? { warning: 'the model did not return valid JSON, so no signals were used.' } : {}),
    })
  }
  if (url.pathname === '/outreach') {
    const tpl = body.profile?.outreach?.[body.kind] || ''
    const offering = body.profile?.offerings?.[body.offering]
    const label = typeof offering === 'string' ? offering : offering?.label || body.offering
    const fill = (t) =>
      String(t || '')
        .replaceAll('{company}', body.lead?.name || '')
        .replaceAll('{city}', body.lead?.city || '')
        .replaceAll('{offering_label}', label)
        .replaceAll('{our_name}', body.business?.our_name || '')
        .replaceAll('{our_title}', body.business?.our_title || '')
        .replaceAll('{our_email}', body.business?.our_email || '')
        .replaceAll('{our_phone}', body.business?.our_phone || '')
    return send(res, 200, { kind: body.kind, text: fill(tpl) })
  }
  if (url.pathname === '/export') {
    const type = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain' }[body.format || 'pdf']
    return send(res, 200, Buffer.from(`MOCK ${body.format}: ${body.text}`), type)
  }
  return send(res, 404, { detail: 'Not found' })
}).listen(PORT, () => console.log(`Mock Omni Model API on http://localhost:${PORT} (key: ${KEY})`))
