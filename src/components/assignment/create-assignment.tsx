"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ProblemSelector } from "./problem-selector"
import { ProcessedProblem } from "@/types"
import { toast } from "sonner"
import {
  Save,
  ArrowLeft,
  Calendar,
  BookOpen,
  Users,
  Target,
  Trash2
} from "lucide-react"

interface ClassInfo {
  id: string
  name: string
  code: string
  studentCount: number
}

interface CreateAssignmentProps {
  assignmentId?: string
  mode?: 'create' | 'edit'
}

export function CreateAssignment({ assignmentId, mode = 'create' }: CreateAssignmentProps) {
  const router = useRouter()
  const { data: session } = useSession()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    classId: "",
    dueDate: ""
  })

  const [selectedProblems, setSelectedProblems] = useState<ProcessedProblem[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [originalAssignment, setOriginalAssignment] = useState<any>(null)

  // 클래스 목록 및 기존 과제 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 클래스 목록 로드
        const classResponse = await fetch('/api/teacher/classes')
        if (classResponse.ok) {
          const data = await classResponse.json()
          setClasses(data)
        }

        // 편집 모드인 경우 기존 과제 데이터 로드
        if (mode === 'edit' && assignmentId) {
          const assignmentResponse = await fetch(`/api/teacher/assignments/${assignmentId}`)
          if (assignmentResponse.ok) {
            const assignment = await assignmentResponse.json()
            setOriginalAssignment(assignment)
            setFormData({
              title: assignment.title,
              description: assignment.description || '',
              classId: assignment.classId || '',
              dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : ''
            })
            setSelectedProblems(assignment.problems || [])
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        // 임시 데이터 (클래스)
        setClasses([
          {
            id: "1",
            name: "수학 3-1반",
            code: "MATH31",
            studentCount: 25
          },
          {
            id: "2",
            name: "수학 3-2반",
            code: "MATH32",
            studentCount: 23
          }
        ])
      }
    }

    loadData()
  }, [mode, assignmentId])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveAssignment = async () => {
    // 유효성 검사
    if (!formData.title.trim()) {
      toast.error("과제 제목을 입력해주세요.")
      return
    }

    if (!formData.classId && mode === 'create') {
      toast.error("클래스를 선택해주세요.")
      return
    }

    if (selectedProblems.length === 0) {
      toast.error("최소 1개 이상의 문제를 선택해주세요.")
      return
    }

    setIsLoading(true)

    try {
      const assignmentData = {
        title: formData.title,
        description: formData.description,
        classId: formData.classId,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        problems: selectedProblems.map((p, index) => ({
          id: p.id,
          order: index + 1
        }))
      }

      const isEdit = mode === 'edit' && assignmentId
      const url = isEdit ? `/api/teacher/assignments/${assignmentId}` : '/api/teacher/assignments'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(isEdit ? "과제가 성공적으로 수정되었습니다!" : "과제가 성공적으로 생성되었습니다!")
        router.push('/teacher')
      } else {
        const error = await response.json()
        toast.error(error.message || (isEdit ? "과제 수정에 실패했습니다." : "과제 생성에 실패했습니다."))
      }
    } catch (error) {
      toast.error(mode === 'edit' ? "과제 수정 중 오류가 발생했습니다." : "과제 생성 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAssignment = async () => {
    if (!assignmentId || mode !== 'edit') return

    if (!confirm('정말로 이 과제를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/teacher/assignments/${assignmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('과제가 성공적으로 삭제되었습니다.')
        router.push('/teacher')
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || '과제 삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error('과제 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedClass = classes.find(c => c.id === formData.classId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>돌아가기</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {mode === 'edit' ? '과제 편집' : '새 과제 생성'}
                </h1>
                <p className="text-gray-600">
                  {mode === 'edit' ? '과제 내용을 수정하거나 삭제할 수 있습니다' : '학생들에게 배정할 과제를 만들어보세요'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 과제 기본 정보 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>과제 정보</span>
                </CardTitle>
                <CardDescription>
                  과제의 기본 정보를 입력해주세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 과제 제목 */}
                <div>
                  <Label htmlFor="title">과제 제목 *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="예: 곱셈 문제 풀이"
                    className="mt-1"
                  />
                </div>

                {/* 과제 설명 */}
                <div>
                  <Label htmlFor="description">과제 설명</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="학생들에게 전달할 과제 설명을 입력하세요"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* 클래스 선택 */}
                {mode === 'create' && (
                  <div>
                    <Label>클래스 선택 *</Label>
                    <Select
                      value={formData.classId}
                      onValueChange={(value) => handleInputChange('classId', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="클래스를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{cls.name}</span>
                              <span className="text-sm text-gray-500 ml-2">
                                ({cls.studentCount}명)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedClass && (
                      <p className="text-sm text-gray-600 mt-1">
                        <Users className="h-3 w-3 inline mr-1" />
                        {selectedClass.studentCount}명의 학생이 과제를 받게 됩니다
                      </p>
                    )}
                  </div>
                )}

                {/* 편집 모드에서는 클래스 정보 표시만 */}
                {mode === 'edit' && originalAssignment && (
                  <div>
                    <Label>클래스</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{originalAssignment.className || '알 수 없음'}</span>
                        <span className="text-sm text-gray-500">
                          (편집 시 클래스는 변경할 수 없습니다)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 마감일 */}
                <div>
                  <Label htmlFor="dueDate">마감일 (선택)</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    className="mt-1"
                  />
                  {formData.dueDate && (
                    <p className="text-sm text-gray-600 mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {new Date(formData.dueDate).toLocaleString('ko-KR')}까지
                    </p>
                  )}
                </div>

                {/* 선택된 문제 요약 */}
                {selectedProblems.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center space-x-2 mb-2">
                      <BookOpen className="h-4 w-4" />
                      <span className="font-medium">문제 요약</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>총 {selectedProblems.length}개 문제</p>
                      <div className="flex space-x-4">
                        <span>하: {selectedProblems.filter(p => p.difficulty === 'easy').length}개</span>
                        <span>중: {selectedProblems.filter(p => p.difficulty === 'medium').length}개</span>
                        <span>상: {selectedProblems.filter(p => p.difficulty === 'hard').length}개</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 액션 버튼들 */}
                <div className="space-y-2 mt-6">
                  <Button
                    onClick={handleSaveAssignment}
                    disabled={isLoading || !formData.title || (mode === 'create' && !formData.classId) || selectedProblems.length === 0}
                    className="w-full"
                  >
                    {isLoading ? (
                      mode === 'edit' ? "과제 수정 중..." : "과제 생성 중..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {mode === 'edit' ? '과제 수정하기' : '과제 생성하기'}
                      </>
                    )}
                  </Button>

                  {mode === 'edit' && (
                    <Button
                      onClick={handleDeleteAssignment}
                      disabled={isDeleting}
                      variant="destructive"
                      className="w-full"
                    >
                      {isDeleting ? (
                        "삭제 중..."
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          과제 삭제하기
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 문제 선택 */}
          <div className="lg:col-span-2">
            <ProblemSelector
              onProblemsSelected={setSelectedProblems}
              selectedProblems={selectedProblems}
            />
          </div>
        </div>
      </div>
    </div>
  )
}