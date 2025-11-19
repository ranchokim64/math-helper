"use client"

import { Button } from "@/components/ui/button"
import { Download, Smartphone } from "lucide-react"
import { usePWAInstall } from "@/hooks/use-pwa-install"

interface InstallAppButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  showIcon?: boolean
}

export function InstallAppButton({
  variant = "outline",
  size = "lg",
  className = "",
  showIcon = true
}: InstallAppButtonProps) {
  const { isInstallable, isInstalled, installApp } = usePWAInstall()

  const handleClick = async () => {
    const outcome = await installApp()

    if (outcome === 'accepted') {
      console.log('앱이 성공적으로 설치되었습니다!')
    } else if (outcome === 'dismissed') {
      console.log('사용자가 설치를 취소했습니다.')
    } else {
      console.log('PWA 설치를 사용할 수 없습니다.')
    }
  }

  // 설치 불가능하거나 이미 설치된 경우 버튼 숨김
  if (!isInstallable || isInstalled) {
    return null
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
    >
      {showIcon && <Smartphone className="h-4 w-4 mr-2" />}
      앱 다운로드
    </Button>
  )
}
