"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Mail, Lock, User, GraduationCap, Users, Hash } from "lucide-react"

type UserRole = "TEACHER" | "STUDENT"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "" as UserRole | "",
    classCode: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRoleSelect = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      classCode: role === "TEACHER" ? "" : prev.classCode
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // 유효성 검사
    if (formData.password !== formData.confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      toast.error("비밀번호는 최소 6자 이상이어야 합니다.")
      setIsLoading(false)
      return
    }

    if (!formData.role) {
      toast.error("역할을 선택해주세요.")
      setIsLoading(false)
      return
    }

    if (formData.role === "STUDENT" && !formData.classCode) {
      toast.error("클래스 코드를 입력해주세요.")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          classCode: formData.role === "STUDENT" ? formData.classCode : undefined,
        }),
      })

      if (response.ok) {
        toast.success("회원가입이 완료되었습니다! 로그인해주세요.")
        router.push("/login")
      } else {
        const error = await response.json()
        toast.error(error.message || "회원가입에 실패했습니다.")
      }
    } catch (error) {
      toast.error("회원가입 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">회원가입</CardTitle>
          <CardDescription className="text-center">
            쌤스케치에 가입하여 시작해보세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 역할 선택 */}
            <div className="space-y-2">
              <Label>역할 선택</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={formData.role === "TEACHER" ? "default" : "outline"}
                  className="h-20 flex-col"
                  onClick={() => handleRoleSelect("TEACHER")}
                >
                  <GraduationCap className="h-6 w-6 mb-1" />
                  교사
                </Button>
                <Button
                  type="button"
                  variant={formData.role === "STUDENT" ? "default" : "outline"}
                  className="h-20 flex-col"
                  onClick={() => handleRoleSelect("STUDENT")}
                >
                  <Users className="h-6 w-6 mb-1" />
                  학생
                </Button>
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요 (최소 6자)"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* 학생인 경우 클래스 코드 입력 */}
            {formData.role === "STUDENT" && (
              <div className="space-y-2">
                <Label htmlFor="classCode">클래스 코드</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="classCode"
                    name="classCode"
                    type="text"
                    placeholder="교사가 제공한 클래스 코드를 입력하세요"
                    value={formData.classCode}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  클래스 코드는 담당 교사에게 문의하세요.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "가입 중..." : "회원가입"}
            </Button>
          </form>

          <div className="text-center text-sm">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}