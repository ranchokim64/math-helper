"use client"

import { useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // 이미 설치되어 있는지 확인
    const checkInstalled = () => {
      const installed = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as NavigatorStandalone).standalone === true
      setIsInstalled(installed)
      return installed
    }

    // 초기 설치 상태 확인
    if (checkInstalled()) {
      return
    }

    // PWA 설치 프롬프트 캐치
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setIsInstallable(true)
      console.log('✅ PWA installable')
    }

    // 앱이 성공적으로 설치되면
    const handleAppInstalled = () => {
      console.log('✅ PWA installed')
      setIsInstallable(false)
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) {
      console.warn('PWA install prompt not available')
      return 'unavailable'
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      console.log(`PWA install outcome: ${outcome}`)

      if (outcome === 'accepted') {
        setIsInstallable(false)
        setIsInstalled(true)
      }

      setDeferredPrompt(null)
      return outcome
    } catch (error) {
      console.error('Error installing PWA:', error)
      return 'unavailable'
    }
  }

  return {
    isInstallable,
    isInstalled,
    installApp,
  }
}
