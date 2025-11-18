import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
  text?: string
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4"
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-gray-300 border-t-blue-600",
          sizeClasses[size]
        )}
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  )
}

// 전체 화면 로딩 스피너
export function FullPageSpinner({ text }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}

// 인라인 스피너 (버튼 등에 사용)
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-current",
        className
      )}
    />
  )
}
