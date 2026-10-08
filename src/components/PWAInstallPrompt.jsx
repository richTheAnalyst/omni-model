import { useEffect, useState } from 'react'
import Button from './Button.jsx'
import Icon from './Icon.jsx'

let deferredPrompt = null

function handleBeforeInstallPrompt(e) {
  e.preventDefault()
  deferredPrompt = e
  window.dispatchEvent(new CustomEvent('pwa-install-available'))
}

function handleAppInstalled() {
  deferredPrompt = null
  window.dispatchEvent(new CustomEvent('pwa-installed'))
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
}

export function PWAInstallPrompt({ className = '', onClose }) {
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    const check = () => setCanInstall(!!deferredPrompt)
    check()
    window.addEventListener('pwa-install-available', check)
    window.addEventListener('pwa-installed', check)
    return () => {
      window.removeEventListener('pwa-install-available', check)
      window.removeEventListener('pwa-installed', check)
    }
  }, [])

  if (!canInstall) return null

  const promptInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') deferredPrompt = null
    setCanInstall(false)
    onClose?.()
  }

  return (
    <div className={`pwa-install-prompt ${className}`.trim()} role="status">
      <Icon name="download" size={18} />
      <div className="pwa-install-text">
        <strong>Install Omni Model</strong>
        <span>Add it to your home screen for offline access and faster loads.</span>
      </div>
      <div className="pwa-install-actions">
        <Button variant="ghost" size="sm" onClick={() => { setCanInstall(false); onClose?.() }}>
          Not now
        </Button>
        <Button variant="primary" size="sm" onClick={promptInstall}>
          Install
        </Button>
      </div>
    </div>
  )
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)
  useEffect(() => {
    const check = () => setCanInstall(!!deferredPrompt)
    check()
    window.addEventListener('pwa-install-available', check)
    window.addEventListener('pwa-installed', check)
    return () => {
      window.removeEventListener('pwa-install-available', check)
      window.removeEventListener('pwa-installed', check)
    }
  }, [])
  const prompt = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') deferredPrompt = null
    setCanInstall(false)
  }
  return { canInstall, prompt }
}