"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    // Service Worker 등록
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('✅ Service Worker registered:', registration.scope)
          },
          (error) => {
            console.error('❌ Service Worker registration failed:', error)
          }
        )
      })
    }

    // PWA 설치 프롬프트 캐치
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // 이미 설치되어 있지 않으면 프롬프트 표시
      if (!isAppInstalled()) {
        setShowInstallPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 앱이 성공적으로 설치되면
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed')
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const isAppInstalled = () => {
    // standalone 모드면 이미 설치된 것
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as NavigatorStandalone).standalone === true
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    console.log(`User response: ${outcome}`)

    if (outcome === 'accepted') {
      setShowInstallPrompt(false)
    }

    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // 24시간 동안 다시 표시하지 않음
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // 이미 설치되었거나 프롬프트가 없으면 표시 안함
  if (!showInstallPrompt || isAppInstalled()) {
    return null
  }

  // 최근 24시간 내에 dismiss했으면 표시 안함
  const dismissedAt = localStorage.getItem('pwa-install-dismissed')
  if (dismissedAt) {
    const hoursSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60)
    if (hoursSinceDismissed < 24) {
      return null
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="border-2 border-blue-500 shadow-lg">
        <CardHeader className="relative pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Download className="h-5 w-5 text-blue-600" />
            <span>앱 설치</span>
          </CardTitle>
          <CardDescription>
            Math Helper를 홈 화면에 추가하여 앱처럼 사용하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 빠른 접근</li>
            <li>• 오프라인 사용</li>
            <li>• 전체 화면 경험</li>
          </ul>
          <Button onClick={handleInstallClick} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            지금 설치하기
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}