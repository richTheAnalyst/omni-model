import { request } from './client.js'

// Sending email from the app. Needs a signed-in account (client.js adds the token), so no API key.
/** { enabled, sent_today, daily_limit } */
export const emailStatus = ({ signal } = {}) => request('/email/status', { signal, auth: false })

/**
 * body: { to, subject, body, sender_name, reply_to, lead_id?, kind: 'email'|'proposal'|'followup',
 *         attachment: { kind: 'none' } | { kind: 'designed', render, filename } | { kind: 'text', text, filename } }
 */
export const sendEmail = (body, { signal } = {}) => request('/email/send', { method: 'POST', body, auth: false, timeoutMs: 120_000, signal })