/** Saves a Blob through a temporary link and releases the object URL afterwards. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoked after the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function copyText(text, fallbackElement) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    if (!fallbackElement) return false
    fallbackElement.focus()
    fallbackElement.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    }
  }
}
