"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"

interface AddClassModalProps {
  onClassAdded?: () => void
}

export function AddClassModal({ onClassAdded }: AddClassModalProps) {
  const [open, setOpen] = useState(false)
  const [className, setClassName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!className.trim()) {
      toast.error("클래스 이름을 입력해주세요.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/teacher/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: className.trim()
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const newClass = result.class || result
        toast.success(`클래스 "${newClass.name}"가 생성되었습니다!`)
        setClassName("")
        setOpen(false)

        // 부모 컴포넌트에 클래스 추가 완료 알림
        if (onClassAdded) {
          onClassAdded()
        }
      } else {
        const error = await response.json()
        toast.error(error.message || "클래스 생성에 실패했습니다.")
      }
    } catch (error) {
      console.error("클래스 생성 오류:", error)
      toast.error("클래스 생성 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setClassName("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>클래스 추가</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>새 클래스 만들기</DialogTitle>
            <DialogDescription>
              새로운 클래스를 생성합니다. 클래스 이름을 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="className" className="text-right">
                클래스 이름
              </Label>
              <Input
                id="className"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="예: 6학년 1반"
                className="col-span-3"
                disabled={isLoading}
                maxLength={50}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !className.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                "생성"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}