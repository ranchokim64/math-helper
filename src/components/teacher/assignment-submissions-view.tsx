"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Users,
  CheckCircle,
  Clock,
  Star,
  FileText,
  Eye
} from "lucide-react"
import { toast } from "sonner"

interface Student {
  id: string
  name: string
  email: string
}

interface Submission {
  id: string
  submittedAt: string
  score: number | null
  status: 'submitted' | 'graded' | 'returned'
  recordingDuration: number
}

interface StudentSubmission {
  student: Student
  submission: Submission | null
}

interface Assignment {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  classId: string
  className: string
  problemCount: number
}

interface Statistics {
  totalStudents: number
  submittedCount: number
  submissionRate: number
  gradedCount: number
  averageScore: number
}

interface AssignmentSubmissionsData {
  assignment: Assignment
  statistics: Statistics
  studentSubmissions: StudentSubmission[]
}

interface AssignmentSubmissionsViewProps {
  assignmentId: string
}

export function AssignmentSubmissionsView({ assignmentId }: AssignmentSubmissionsViewProps) {
  const router = useRouter()
  const [data, setData] = useState<AssignmentSubmissionsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/teacher/assignments/${assignmentId}/submissions`)

        if (!response.ok) {
          throw new Error('Failed to fetch assignment submissions')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching assignment submissions:', err)
        setError('제출물 데이터를 불러오는데 실패했습니다.')
        toast.error('제출물 데이터를 불러오는데 실패했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [assignmentId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusBadge = (status: 'submitted' | 'graded' | 'returned') => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">채점 대기</Badge>
      case 'graded':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">채점 완료</Badge>
      case 'returned':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">반환됨</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500">{error || '데이터를 불러올 수 없습니다.'}</p>
            <Button
              onClick={() => router.back()}
              className="mt-4"
            >
              돌아가기
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { assignment, statistics, studentSubmissions } = data

  return (
    <div className="container mx-auto py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/teacher')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          교사 대시보드로
        </Button>

        <div>
          <h1 className="text-3xl font-bold">{assignment.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span>{assignment.className}</span>
            {assignment.dueDate && (
              <>
                <span>•</span>
                <span>마감: {formatDate(assignment.dueDate)}</span>
              </>
            )}
            <span>•</span>
            <span>문제 {assignment.problemCount}개</span>
          </div>
          {assignment.description && (
            <p className="mt-2 text-muted-foreground">{assignment.description}</p>
          )}
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 학생</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalStudents}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">제출 완료</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.submittedCount}명</div>
            <p className="text-xs text-muted-foreground mt-1">
              제출률 {statistics.submissionRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">채점 완료</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.gradedCount}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.averageScore}점</div>
          </CardContent>
        </Card>
      </div>

      {/* 학생 제출물 그리드 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">학생별 제출 현황</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {studentSubmissions.map(({ student, submission }) => (
            <Card
              key={student.id}
              className={`${
                submission
                  ? 'border-border'
                  : 'border-dashed border-muted-foreground/30 bg-muted/30'
              }`}
            >
              <CardHeader>
                <CardTitle className="text-base">{student.name}</CardTitle>
                <CardDescription className="text-sm">{student.email}</CardDescription>
              </CardHeader>
              <CardContent>
                {submission ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">상태</span>
                      {getStatusBadge(submission.status)}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">제출일</span>
                      <span className="text-sm">
                        {new Date(submission.submittedAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>

                    {submission.score !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">점수</span>
                        <span className="text-sm font-semibold">{submission.score}점</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">소요 시간</span>
                      <span className="text-sm">{formatDuration(submission.recordingDuration)}</span>
                    </div>

                    <Link href={`/teacher/submissions/${submission.id}`}>
                      <Button className="w-full mt-2" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        검토하기
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">미제출</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {studentSubmissions.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">이 클래스에 학생이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
