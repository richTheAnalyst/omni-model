// Reports gzip sizes for every built asset, and what the first page load fetches.
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
const dir = 'dist/assets'
const files = readdirSync(dir)
const size = (f) => gzipSync(readFileSync(`${dir}/${f}`)).length
const html = readFileSync('dist/index.html', 'utf8')
const initial = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.(?:js|css))"/g)].map((m) => m[1])
const kb = (n) => (n / 1024).toFixed(1).padStart(6) + ' kB'
let total = 0
console.log('Initial load (index.html references):')
for (const f of initial) { const s = size(f); total += s; console.log(' ', kb(s), f) }
console.log('  ------\n ', kb(total), 'total gzip (JS + CSS)\n')
const lazy = files.filter((f) => f.endsWith('.js') && !initial.includes(f))
console.log('Loaded on demand:')
for (const f of lazy) console.log(' ', kb(size(f)), f)
