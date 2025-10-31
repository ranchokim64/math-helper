"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  BookOpen,
  Plus,
  Settings,
  LogOut,
  Copy,
  CheckCircle,
  Clock,
  FileText,
  Star,
  Eye,
  RotateCcw
} from "lucide-react"
import { toast } from "sonner"
import { AddClassModal } from "@/components/teacher/add-class-modal"

interface Class {
  id: string
  name: string
  code: string
  studentCount: number
  assignmentCount: number
}

interface Assignment {
  id: string
  title: string
  dueDate: string | null
  submissionCount: number
  totalStudents: number
  classId: string
  className: string
}

interface Submission {
  id: string
  studentName: string
  assignmentTitle: string
  submittedAt: string
  status: "submitted" | "graded" | "returned"
  score?: number
  recordingDuration?: number
}

export function TeacherDashboard() {
  const { data: session } = useSession()
  const [classes, setClasses] = useState<Class[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      // 실제 클래스 데이터 가져오기
      let classes: Class[] = []

      try {
        const classResponse = await fetch('/api/teacher/classes')

        if (classResponse.ok) {
          const fetchedClasses = await classResponse.json()
          // API 응답을 Class 인터페이스에 맞게 변환
          classes = fetchedClasses.map((cls: { id: string; name: string; code: string; teacherId: string; createdAt: string; updatedAt: string; _count?: { students: number } }) => ({
            id: cls.id,
            name: cls.name,
            code: cls.code,
            studentCount: cls.studentCount || cls.students?.length || 0,
            assignmentCount: cls.assignmentCount || cls.assignments?.length || 0
          }))
        } else {
          console.error('클래스 데이터를 가져오는데 실패했습니다:', classResponse.status)
          // 클래스 데이터를 가져오지 못한 경우 빈 배열 유지
        }
      } catch (classError) {
        console.error('클래스 API 호출 중 오류:', classError)
        // 네트워크 오류 등의 경우 빈 배열 유지
      }

      // 실제 과제 데이터 가져오기
      let assignments: Assignment[] = []

      try {
        const assignmentResponse = await fetch('/api/teacher/assignments')

        if (assignmentResponse.ok) {
          const fetchedAssignments = await assignmentResponse.json()
          // API 응답을 Assignment 인터페이스에 맞게 변환
          assignments = fetchedAssignments.map((assignment: any) => ({
            id: assignment.id,
            title: assignment.title,
            dueDate: assignment.dueDate,
            submissionCount: assignment.submissionCount || assignment.submissions?.length || 0,
            totalStudents: assignment.studentCount || assignment.class?.students?.length || 0,
            classId: assignment.classId,
            className: assignment.className || assignment.class?.name || '알 수 없음'
          }))
        } else {
          console.error('과제 데이터를 가져오는데 실패했습니다:', assignmentResponse.status)
          // 과제 데이터를 가져오지 못한 경우 빈 배열 유지
        }
      } catch (assignmentError) {
        console.error('과제 API 호출 중 오류:', assignmentError)
        // 네트워크 오류 등의 경우 빈 배열 유지
      }

      // 실제 제출물 데이터 가져오기
      let submissions: Submission[] = []

      try {
        const submissionResponse = await fetch('/api/teacher/submissions')

        if (submissionResponse.ok) {
          const fetchedSubmissions = await submissionResponse.json()
          submissions = fetchedSubmissions
        } else {
          console.error('제출물 데이터를 가져오는데 실패했습니다:', submissionResponse.status)
        }
      } catch (submissionError) {
        console.error('제출물 API 호출 중 오류:', submissionError)
      }

      setClasses(classes)
      setAssignments(assignments)
      setSubmissions(submissions)

      // 첫 번째 클래스를 기본으로 선택 (클래스가 있는 경우)
      if (classes.length > 0 && !selectedClassId) {
        setSelectedClassId(classes[0]!.id)
      }
    } catch (error) {
      toast.error("데이터를 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleCopyClassCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success("클래스 코드가 복사되었습니다!")
    } catch (error) {
      toast.error("클래스 코드 복사에 실패했습니다.")
    }
  }

  const handleClassAdded = useCallback(() => {
    // 클래스 목록 다시 불러오기
    fetchDashboardData()
  }, [fetchDashboardData])

  // 선택된 클래스의 과제만 필터링
  const filteredAssignments = selectedClassId
    ? assignments.filter(assignment => assignment.classId === selectedClassId)
    : assignments

  // 선택된 클래스 정보 가져오기
  const selectedClass = classes.find(cls => cls.id === selectedClassId)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">교사 대시보드</h1>
              <p className="text-gray-600">안녕하세요, {session?.user?.name}님!</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                설정
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="classes">클래스 관리</TabsTrigger>
            <TabsTrigger value="assignments">과제 관리</TabsTrigger>
            <TabsTrigger value="submissions">제출물 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 클래스</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{classes.length}</div>
                  <p className="text-xs text-muted-foreground">
                    총 {classes.reduce((sum, cls) => sum + cls.studentCount, 0)}명의 학생
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">진행 중인 과제</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{assignments.length}</div>
                  <p className="text-xs text-muted-foreground">
                    평균 제출률 {assignments.length > 0 ? Math.round(
                      assignments.reduce((sum, a) => sum + (a.submissionCount / a.totalStudents * 100), 0) / assignments.length
                    ) : 0}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">이번 주 제출</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {assignments.reduce((sum, a) => sum + a.submissionCount, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    총 {assignments.reduce((sum, a) => sum + a.totalStudents, 0)}개 중
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>최근 활동</CardTitle>
                <CardDescription>
                  최근 학생들의 과제 제출 현황입니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{assignment.title}</h4>
                        <p className="text-sm text-gray-600">
                          제출: {assignment.submissionCount}/{assignment.totalStudents}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {assignment.dueDate && (
                          <Badge variant="outline">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </Badge>
                        )}
                        <Badge variant={assignment.submissionCount === assignment.totalStudents ? "default" : "secondary"}>
                          {Math.round((assignment.submissionCount / assignment.totalStudents) * 100)}% 완료
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">클래스 관리</h2>
              <AddClassModal onClassAdded={handleClassAdded} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <Card key={cls.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {cls.name}
                      <Badge variant="outline">{cls.code}</Badge>
                    </CardTitle>
                    <CardDescription>
                      {cls.studentCount}명의 학생 • {cls.assignmentCount}개의 과제
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyClassCode(cls.code)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        코드 복사
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/teacher/classes/${cls.id}`}>
                          관리
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold">과제 관리</h2>
                {classes.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">클래스:</span>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="클래스를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button asChild disabled={!selectedClassId}>
                <Link href={selectedClassId ? `/teacher/assignments/new?classId=${selectedClassId}` : "#"}>
                  <Plus className="w-4 h-4 mr-2" />
                  새 과제 생성
                </Link>
              </Button>
            </div>

            {!selectedClassId && classes.length > 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">클래스를 선택하세요</h3>
                    <p className="text-sm text-muted-foreground">
                      위의 드롭다운에서 클래스를 선택하면 해당 클래스의 과제 목록을 볼 수 있습니다.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {classes.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">클래스가 없습니다</h3>
                    <p className="text-sm text-muted-foreground">
                      먼저 클래스를 생성해주세요.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{assignment.title}</CardTitle>
                        <CardDescription>
                          제출률: {assignment.submissionCount}/{assignment.totalStudents}
                          ({Math.round((assignment.submissionCount / assignment.totalStudents) * 100)}%)
                        </CardDescription>
                      </div>
                      {assignment.dueDate && (
                        <Badge variant="outline">
                          마감: {new Date(assignment.dueDate).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        제출물 확인
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/teacher/assignments/${assignment.id}/edit`}>
                          편집
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {selectedClassId && filteredAssignments.length === 0 && (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">과제가 없습니다</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {selectedClass?.name}에 생성된 과제가 없습니다.
                      </p>
                      <Button asChild>
                        <Link href={`/teacher/assignments/new?classId=${selectedClassId}`}>
                          <Plus className="w-4 h-4 mr-2" />
                          첫 과제 생성하기
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">제출물 관리</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  총 {submissions.length}개 제출물
                </Badge>
                <Badge variant="secondary">
                  {submissions.filter(s => s.status === 'submitted').length}개 채점 대기
                </Badge>
              </div>
            </div>

            {/* 제출물 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 제출물</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{submissions.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">채점 대기</CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {submissions.filter(s => s.status === 'submitted').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">채점 완료</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {submissions.filter(s => s.status === 'graded').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
                  <Star className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {submissions.filter(s => s.score).length > 0
                      ? Math.round(
                          submissions
                            .filter(s => s.score)
                            .reduce((sum, s) => sum + (s.score || 0), 0) /
                          submissions.filter(s => s.score).length
                        )
                      : '--'}점
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 제출물 목록 */}
            <Card>
              <CardHeader>
                <CardTitle>최근 제출물</CardTitle>
                <CardDescription>
                  학생들이 제출한 과제를 검토하고 채점할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{submission.studentName}</h4>
                          <Badge variant={
                            submission.status === 'graded' ? 'default' :
                            submission.status === 'returned' ? 'secondary' : 'outline'
                          }>
                            {submission.status === 'graded' ? '채점 완료' :
                             submission.status === 'returned' ? '반환됨' : '채점 대기'}
                          </Badge>
                          {submission.score && (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              {submission.score}점
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{submission.assignmentTitle}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>제출: {new Date(submission.submittedAt).toLocaleString('ko-KR')}</span>
                          {submission.recordingDuration && (
                            <span>
                              녹화: {Math.floor(submission.recordingDuration / 60)}분 {submission.recordingDuration % 60}초
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/teacher/submissions/${submission.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            검토하기
                          </Link>
                        </Button>
                        {submission.status === 'graded' && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/teacher/submissions/${submission.id}`}>
                              <RotateCcw className="h-4 w-4 mr-1" />
                              재채점
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {submissions.length === 0 && (
                  <div className="text-center text-gray-500 py-12">
                    아직 제출된 과제가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}