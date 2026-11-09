import { request } from './client.js'

// The business's own proposal PDF. Needs a signed-in account (client.js adds the token), so no API key.
export const getProposalTemplate = ({ signal } = {}) => request('/proposal-template', { signal, auth: false })

/** replacements: [{ find: 'Acme Ltd', as: 'company' }]. Returns { template, found, missing }. */
export const saveProposalTemplate = ({ filename, data, replacements }, { signal } = {}) =>
  request('/proposal-template', { method: 'PUT', body: { filename, data, replacements }, auth: false, timeoutMs: 90_000, signal })

export const deleteProposalTemplate = () => request('/proposal-template', { method: 'DELETE', auth: false })

/** One filled-in proposal as a PDF Blob. body: { company, city, offering_label, business } */
export const renderProposal = (body, { signal } = {}) =>
  request('/proposal-template/render', { method: 'POST', body, auth: false, timeoutMs: 120_000, signal, responseType: 'blob' })

/** Several proposals as a zip Blob. items: the same shape as renderProposal's body. */
export const renderProposals = (items, { signal } = {}) =>
  request('/proposal-template/render-many', { method: 'POST', body: { items }, auth: false, timeoutMs: 240_000, signal, responseType: 'blob' })

/** The text on every page as it will read for this company: { pages: [{ width, height, lines: [{ i, text, box }] }] } */
export const proposalLines = (body, { signal } = {}) =>
  request('/proposal-template/lines', { method: 'POST', body, auth: false, timeoutMs: 60_000, signal })

/** One page as a picture (a JPEG Blob), with the edits in body.overrides applied. */
export const proposalPage = (body, { signal } = {}) =>
  request('/proposal-template/page', { method: 'POST', body, auth: false, timeoutMs: 90_000, signal, responseType: 'blob' })