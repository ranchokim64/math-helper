"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Clock,
  CheckCircle,
  Settings,
  LogOut,
  Play,
  Star,
  Calendar,
  User
} from "lucide-react"
import { toast } from "sonner"

interface Assignment {
  id: string
  title: string
  description: string
  dueDate: string | null
  status: "pending" | "submitted" | "graded"
  score?: number
  feedback?: string
  className: string
  teacherName: string
  problemCount: number
  submissionId?: string
  createdAt: string
}

interface ClassInfo {
  id: string
  name: string
  code: string
  teacherName: string
  studentCount: number
  totalAssignments: number
  submittedAssignments: number
  gradedAssignments: number
  averageScore: number
  completionRate: number
}

export function StudentDashboard() {
  const { data: session } = useSession()
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 실제 API 호출
        const [assignmentResponse, classResponse] = await Promise.all([
          fetch('/api/student/assignments'),
          fetch('/api/student/classes')
        ])

        if (assignmentResponse.ok) {
          const assignmentData = await assignmentResponse.json()
          setAssignments(assignmentData)
        } else {
          console.error('Failed to fetch assignments:', assignmentResponse.status)
        }

        if (classResponse.ok) {
          const classData = await classResponse.json()
          setClasses(classData)
        } else {
          console.error('Failed to fetch classes:', classResponse.status)
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        toast.error("데이터를 불러오는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  const getStatusBadge = (status: Assignment["status"], score?: number) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">미제출</Badge>
      case "submitted":
        return <Badge variant="outline">제출 완료</Badge>
      case "graded":
        return (
          <Badge variant="default">
            <Star className="w-3 h-3 mr-1" />
            {score}점
          </Badge>
        )
    }
  }

  const pendingAssignments = assignments.filter(a => a.status === "pending")
  const submittedAssignments = assignments.filter(a => a.status === "submitted")
  const gradedAssignments = assignments.filter(a => a.status === "graded")

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
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">학생 대시보드</h1>
              <p className="text-xl text-gray-600 mt-1">안녕하세요, {session?.user?.name}님!</p>
              {classes.length > 0 && (
                <p className="text-base text-gray-500 mt-1">
                  {classes.map(c => `${c.name} (${c.teacherName})`).join(', ')}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="default">
                <Settings className="w-5 h-5 mr-2" />
                <span className="text-base">설정</span>
              </Button>
              <Button variant="outline" size="default" onClick={handleSignOut}>
                <LogOut className="w-5 h-5 mr-2" />
                <span className="text-base">로그아웃</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList className="h-12">
            <TabsTrigger value="assignments" className="text-lg px-6">과제</TabsTrigger>
            <TabsTrigger value="submissions" className="text-lg px-6">제출 기록</TabsTrigger>
            <TabsTrigger value="progress" className="text-lg px-6">학습 진도</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-lg font-medium">미제출 과제</CardTitle>
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-600">{pendingAssignments.length}</div>
                  <p className="text-base text-muted-foreground mt-1">
                    빨리 제출해주세요!
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-lg font-medium">제출 완료</CardTitle>
                  <CheckCircle className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600">{submittedAssignments.length}</div>
                  <p className="text-base text-muted-foreground mt-1">
                    채점 대기 중
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-lg font-medium">평균 점수</CardTitle>
                  <Star className="h-6 w-6 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600">
                    {gradedAssignments.length > 0
                      ? Math.round(gradedAssignments.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAssignments.length)
                      : "--"}점
                  </div>
                  <p className="text-base text-muted-foreground mt-1">
                    {gradedAssignments.length}개 과제 기준
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Assignments */}
            {pendingAssignments.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-red-600">📋 미제출 과제</h3>
                <div className="grid gap-4">
                  {pendingAssignments.map((assignment) => (
                    <Card key={assignment.id} className="border-l-4 border-l-red-500">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center space-x-2 text-xl">
                              <span>{assignment.title}</span>
                              {getStatusBadge(assignment.status, assignment.score)}
                            </CardTitle>
                            <CardDescription className="text-base mt-2">{assignment.description}</CardDescription>
                            <p className="text-base text-gray-500 mt-2">{assignment.className}</p>
                          </div>
                          {assignment.dueDate && (
                            <Badge variant="outline" className="text-red-600">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(assignment.dueDate).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button
                          className="w-full sm:w-auto text-lg py-6"
                          size="lg"
                          onClick={() => router.push(`/student/assignment/${assignment.id}`)}
                        >
                          <Play className="w-5 h-5 mr-2" />
                          과제 시작하기
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Other Assignments */}
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold">📚 전체 과제</h3>
              <div className="grid gap-4">
                {assignments.filter(a => a.status !== "pending").map((assignment) => (
                  <Card key={assignment.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>{assignment.title}</span>
                            {getStatusBadge(assignment.status, assignment.score)}
                          </CardTitle>
                          <CardDescription>{assignment.description}</CardDescription>
                          <p className="text-sm text-gray-500 mt-1">{assignment.className}</p>
                          {assignment.feedback && (
                            <p className="text-sm text-blue-600 mt-2 italic">
                              &ldquo;{assignment.feedback}&rdquo;
                            </p>
                          )}
                        </div>
                        {assignment.dueDate && (
                          <Badge variant="outline">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    {assignment.status === "submitted" && assignment.submissionId && (
                      <CardContent>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/student/submission/${assignment.submissionId}`)}
                        >
                          제출물 확인
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                ))}
                {assignments.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        배정된 과제가 없습니다
                      </h3>
                      <p className="text-gray-600">
                        선생님이 과제를 배정하면 여기에 나타납니다.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <h3 className="text-lg font-semibold">📝 제출 기록</h3>
            <div className="grid gap-4">
              {assignments.filter(a => a.status === "submitted" || a.status === "graded").map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{assignment.title}</CardTitle>
                        <CardDescription>
                          클래스: {assignment.className} • {assignment.teacherName}
                        </CardDescription>
                        {assignment.feedback && (
                          <p className="text-sm text-blue-600 mt-2 italic">
                            선생님 피드백: &ldquo;{assignment.feedback}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {getStatusBadge(assignment.status, assignment.score)}
                        {assignment.dueDate && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {assignment.submissionId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/student/submission/${assignment.submissionId}`)}
                      >
                        제출물 다시 보기
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/student/assignment/${assignment.id}`)}
                      >
                        과제 시작하기
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {assignments.filter(a => a.status === "submitted" || a.status === "graded").length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      아직 제출한 과제가 없습니다
                    </h3>
                    <p className="text-gray-600">
                      과제를 완료하고 제출하면 여기에 기록이 나타납니다.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <h3 className="text-lg font-semibold">📈 학습 진도</h3>
            <Card>
              <CardHeader>
                <CardTitle>이번 학기 진도</CardTitle>
                <CardDescription>
                  현재까지의 학습 성취도를 확인해보세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>전체 과제 완료율</span>
                    <span className="font-semibold">
                      {assignments.length > 0
                        ? Math.round(((submittedAssignments.length + gradedAssignments.length) / assignments.length) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${assignments.length > 0
                          ? ((submittedAssignments.length + gradedAssignments.length) / assignments.length) * 100
                          : 0}%`
                      }}
                    ></div>
                  </div>

                  {gradedAssignments.length > 0 && (
                    <>
                      <div className="flex justify-between items-center mt-4">
                        <span>평균 점수</span>
                        <span className="font-semibold">
                          {Math.round(gradedAssignments.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAssignments.length)}점
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(gradedAssignments.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAssignments.length)}%`
                          }}
                        ></div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}