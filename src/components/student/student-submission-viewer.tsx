"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProblemViewer } from "@/components/problem/problem-viewer"
import { ProcessedProblem } from "@/types"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Star,
  MessageSquare
} from "lucide-react"

interface StudentAnswer {
  problemId: string
  answer: string
  hasDrawing: boolean
  canvasData?: string
}

interface ProblemRecording {
  id: string
  problemId: string
  problemIndex: number
  capturedImageUrl?: string  // 학생 필기가 포함된 캡처 이미지
  duration: number
}

interface SubmissionData {
  id: string
  assignmentId: string
  assignmentTitle: string
  assignmentDescription?: string
  dueDate?: string
  submittedAt: string
  answers: Record<string, StudentAnswer>
  problems: ProcessedProblem[]
  problemRecordings?: ProblemRecording[]
  feedback?: string
  score?: number
  status: "submitted" | "graded" | "draft"
}

interface StudentSubmissionViewerProps {
  submissionId: string
}

export function StudentSubmissionViewer({ submissionId }: StudentSubmissionViewerProps) {
  const router = useRouter()
  const [submission, setSubmission] = useState<SubmissionData | null>(null)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // 제출물 데이터 로드
  useEffect(() => {
    const loadSubmission = async () => {
      try {
        const response = await fetch(`/api/student/submissions/${submissionId}`)

        if (!response.ok) {
          throw new Error('Failed to load submission')
        }

        const data = await response.json()
        setSubmission(data)

      } catch (error) {
        console.error('Error loading submission:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSubmission()
  }, [submissionId])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">제출물을 불러오는 중...</div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-red-600">제출물을 찾을 수 없습니다.</div>
      </div>
    )
  }

  const currentProblem = submission.problems[currentProblemIndex]
  const currentRecording = submission.problemRecordings?.find(
    rec => rec.problemIndex === currentProblemIndex
  )

  const goToPrevious = () => {
    if (currentProblemIndex > 0) {
      setCurrentProblemIndex(currentProblemIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentProblemIndex < submission.problems.length - 1) {
      setCurrentProblemIndex(currentProblemIndex + 1)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="default"
              onClick={() => router.push("/student")}
              className="h-10"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-base">돌아가기</span>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{submission.assignmentTitle}</h1>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant={submission.status === "graded" ? "default" : "secondary"} className="text-base px-3 py-1">
                  {submission.status === "graded" ? "채점 완료" : "제출 완료"}
                </Badge>
                {submission.status === "graded" && submission.score !== undefined && (
                  <Badge variant="outline" className="flex items-center space-x-1 text-base px-3 py-1">
                    <Star className="h-4 w-4" />
                    <span>{submission.score}점</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-base text-gray-600">
            <Clock className="h-5 w-5" />
            <span>제출: {new Date(submission.submittedAt).toLocaleString('ko-KR')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* 문제 영역 */}
          <div className="flex-1 flex flex-col px-4 py-4 overflow-hidden">
            {/* 문제 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">
                문제 {currentProblemIndex + 1} / {submission.problems.length}
              </h2>
              {currentRecording?.capturedImageUrl && (
                <Badge variant="outline" className="text-base px-3 py-1">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  필기 포함
                </Badge>
              )}
            </div>

            {/* 문제 뷰어 - 읽기 전용 */}
            <div className="flex-1 overflow-hidden mb-3">
              <ProblemViewer
                problem={currentProblem}
                showMetadata={false}
                showAnswerKey={false}
                className="h-full w-full"
                enableDrawing={false}
                disabled={true}
              />
            </div>

            {/* 내가 작성한 필기 표시 */}
            {currentRecording?.capturedImageUrl && (
              <div className="mb-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-xl flex items-center space-x-2">
                      <span>✍️ 내가 작성한 필기</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative w-full">
                      <img
                        src={currentRecording.capturedImageUrl}
                        alt="내 필기"
                        className="w-full h-auto object-contain border rounded"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 네비게이션 */}
            <div className="flex items-center justify-between flex-shrink-0 gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={goToPrevious}
                disabled={currentProblemIndex === 0}
                className="h-11 text-base"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                이전 문제
              </Button>

              <div className="flex space-x-2">
                {submission.problems.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentProblemIndex(index)}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center text-base ${
                      index === currentProblemIndex
                        ? 'border-blue-500 bg-blue-500 text-white font-semibold'
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="default"
                onClick={goToNext}
                disabled={currentProblemIndex === submission.problems.length - 1}
                className="h-11 text-base"
              >
                다음 문제
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* 사이드바 - 피드백 표시 */}
          <div className="lg:w-96 lg:border-l border-t lg:border-t-0 flex-shrink-0 p-4 space-y-4 overflow-y-auto bg-white">
            {/* 제출 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">제출 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-base">
                <div className="flex justify-between">
                  <span className="text-gray-600">상태</span>
                  <Badge variant={submission.status === "graded" ? "default" : "secondary"}>
                    {submission.status === "graded" ? "채점 완료" : "채점 대기"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">제출 시각</span>
                  <span className="font-medium">
                    {new Date(submission.submittedAt).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {submission.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">마감 시각</span>
                    <span className="font-medium">
                      {new Date(submission.dueDate).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 선생님 피드백 */}
            {submission.status === "graded" && (
              <>
                {submission.score !== undefined && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center space-x-2">
                        <Star className="h-6 w-6 text-yellow-500" />
                        <span>총점</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-5xl font-bold text-blue-600 text-center">
                        {submission.score}점
                      </div>
                    </CardContent>
                  </Card>
                )}

                {submission.feedback && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center space-x-2">
                        <MessageSquare className="h-6 w-6 text-green-600" />
                        <span>선생님 피드백</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {submission.feedback}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {submission.status !== "graded" && (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600">
                    선생님이 채점 중입니다
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
