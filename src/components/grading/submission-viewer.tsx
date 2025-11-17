"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { ProblemViewer } from "@/components/problem/problem-viewer"
import { ActivityTimeline } from "./activity-timeline"
import { ProcessedProblem, ActivitySegment } from "@/types"
import { toast } from "sonner"
import {
  User,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  Star,
  Save,
  Send,
  ArrowLeft,
  ArrowRight,
  Download
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
  recordingUrl: string
  capturedImageUrl?: string  // 학생 필기가 포함된 캡처 이미지
  duration: number
  segments?: ActivitySegment[]
  firstReactionTime?: number  // 최초 반응 시간 (초)
}

interface SubmissionData {
  id: string
  studentId: string
  studentName: string
  assignmentId: string
  assignmentTitle: string
  submittedAt: string
  recordingUrl?: string  // 레거시 (전체 과제 녹화)
  recordingDuration?: number  // 레거시
  segments?: ActivitySegment[]  // 레거시
  answers: Record<string, StudentAnswer>
  problems: ProcessedProblem[]
  problemRecordings?: ProblemRecording[]  // 문제별 녹화
  feedback?: string
  score?: number
  gradedAt?: string
  status: "submitted" | "graded" | "returned"
}

interface SubmissionViewerProps {
  submissionId: string
  onBack?: () => void
}

export function SubmissionViewer({ submissionId, onBack }: SubmissionViewerProps) {
  const router = useRouter()
  const [submission, setSubmission] = useState<SubmissionData | null>(null)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 채점 상태
  const [feedback, setFeedback] = useState("")
  const [problemScores, setProblemScores] = useState<Record<string, number>>({})

  // 제출물 데이터 로드
  useEffect(() => {
    const loadSubmission = async () => {
      try {
        // 실제 API 호출
        const response = await fetch(`/api/teacher/submissions/${submissionId}`)

        if (!response.ok) {
          throw new Error('Failed to load submission')
        }

        const data = await response.json()

        setSubmission(data)
        setFeedback(data.feedback || "")

        // 문제별 점수 초기화
        const initialScores: Record<string, number> = {}
        data.problems.forEach((problem: ProcessedProblem) => {
          initialScores[problem.id] = 0
        })
        setProblemScores(initialScores)

      } catch (error) {
        console.error('Load submission error:', error)

        // 에러 시 임시 데이터 사용 (개발용)
        const baseTime = Date.now() - 1847000 // 30분 47초 전
        const mockSegments: ActivitySegment[] = [
          // 첫 번째 필기 (3분 25초)
          { type: 'writing', startTime: baseTime, endTime: baseTime + 205000, duration: 205 },
          // 첫 번째 고민 (2분 15초)
          { type: 'paused', startTime: baseTime + 205000, endTime: baseTime + 340000, duration: 135 },
          // 두 번째 필기 (2분 35초)
          { type: 'writing', startTime: baseTime + 340000, endTime: baseTime + 495000, duration: 155 },
          // 두 번째 고민 (4분 15초)
          { type: 'paused', startTime: baseTime + 495000, endTime: baseTime + 750000, duration: 255 },
          // 세 번째 필기 (5분 10초)
          { type: 'writing', startTime: baseTime + 750000, endTime: baseTime + 1060000, duration: 310 },
          // 세 번째 고민 (3분 50초)
          { type: 'paused', startTime: baseTime + 1060000, endTime: baseTime + 1290000, duration: 230 },
          // 네 번째 필기 (8분 25초)
          { type: 'writing', startTime: baseTime + 1290000, endTime: baseTime + 1795000, duration: 505 },
          // 답안 작성 (52초)
          { type: 'writing', startTime: baseTime + 1795000, endTime: baseTime + 1847000, duration: 52 }
        ]

        const mockSubmission: SubmissionData = {
          id: submissionId,
          studentId: "student1",
          studentName: "김학생",
          assignmentId: "assignment1",
          assignmentTitle: "곱셈 문제 풀이",
          submittedAt: "2024-01-15T14:30:00Z",
          recordingUrl: "/mock-recording.webm", // 실제로는 blob URL이나 서버 URL
          recordingDuration: 1847, // 30분 47초
          segments: mockSegments,
          status: "submitted",
          answers: {
            "S3_초등_3_008547": {
              problemId: "S3_초등_3_008547",
              answer: "3",
              hasDrawing: true,
              canvasData: "mock-canvas-data"
            },
            "S4_초등_4_012345": {
              problemId: "S4_초등_4_012345",
              answer: "3/8",
              hasDrawing: true,
              canvasData: "mock-canvas-data-2"
            }
          },
          problems: [
            {
              id: "S3_초등_3_008547",
              imageUrl: "/api/problems/image/sample1",
              difficulty: "easy" as const,
              type: "multiple_choice" as const,
              grade: "3학년",
              semester: "2학기",
              subject: "수학",
              metadata: {
                source_data_name: "S3_초등_3_008547",
                "2009_achievement_standard": [" "],
                "2015_achievement_standard": [
                  "[4수01-05] 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다."
                ],
                "2022_achievement_standard": [
                  "[4수01-04] 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다."
                ],
                level_of_difficulty: "하",
                types_of_problems: "객관식"
              },
              sections: [
                {
                  type: "question",
                  content: "색칠된 부분은 실제 어떤 수의 곱인지를 찾아 선택하세요. $2 \\times 6 = 12$인지 확인해보세요.",
                  position: 0
                },
                {
                  type: "choices",
                  content: "㉠ 2 × 6 ㉡ 2 × 60 ㉢ 20 × 6 ㉣ 200 × 6",
                  position: 1
                },
                {
                  type: "image",
                  content: "곱셈 계산 표",
                  position: 2
                }
              ]
            },
            {
              id: "S4_초등_4_012345",
              imageUrl: "/api/problems/image/sample2",
              difficulty: "medium" as const,
              type: "subjective" as const,
              grade: "4학년",
              semester: "1학기",
              subject: "수학",
              metadata: {
                source_data_name: "S4_초등_4_012345",
                "2009_achievement_standard": [" "],
                "2015_achievement_standard": [
                  "[4수02-01] 분수의 의미와 표현을 이해한다."
                ],
                "2022_achievement_standard": [
                  "[4수02-01] 분수의 의미와 표현을 이해한다."
                ],
                level_of_difficulty: "중",
                types_of_problems: "주관식"
              },
              sections: [
                {
                  type: "question",
                  content: "다음 그림에서 색칠된 부분을 분수로 나타내세요. 전체가 $1$이고 색칠된 부분이 $\\frac{3}{8}$인지 확인해보세요.",
                  position: 0
                },
                {
                  type: "image",
                  content: "원이 8등분된 그림에서 3개가 색칠된 모습",
                  position: 1
                }
              ]
            }
          ]
        }

        setSubmission(mockSubmission)
        setFeedback(mockSubmission.feedback || "")

        // 문제별 점수 초기화
        const initialScores: Record<string, number> = {}
        mockSubmission.problems.forEach(problem => {
          initialScores[problem.id] = 0
        })
        setProblemScores(initialScores)
      } finally {
        setIsLoading(false)
      }
    }

    loadSubmission()
  }, [submissionId])

  // 채점 저장
  const saveGrading = async (isSubmit = false) => {
    if (!submission) return

    setIsSaving(true)
    try {
      const totalScore = Object.values(problemScores).reduce((sum, score) => sum + score, 0)

      // 실제 API 호출
      const response = await fetch(`/api/teacher/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback,
          score: totalScore,
          problemScores,
          isSubmit  // 채점 완료 여부 전달
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save grading')
      }

      if (isSubmit) {
        toast.success("채점이 완료되었습니다!")
        // 과제별 제출물 확인 페이지로 리다이렉트
        router.push(`/teacher/assignments/${submission.assignmentId}/submissions`)
      } else {
        toast.success("임시 저장되었습니다.")
      }

    } catch (error) {
      console.error('Save grading error:', error)
      toast.error("저장 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  // 문제별 점수 변경
  const handleProblemScoreChange = (problemId: string, score: number) => {
    setProblemScores(prev => ({
      ...prev,
      [problemId]: Math.max(0, Math.min(100, score))
    }))
  }

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">제출물을 불러오는 중...</div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">제출물을 찾을 수 없습니다.</div>
      </div>
    )
  }

  const currentProblem = submission.problems[currentProblemIndex]
  const totalScore = Object.values(problemScores).reduce((sum, score) => sum + score, 0)
  const maxScore = submission.problems.length * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => {
                  if (onBack) {
                    onBack()
                  } else {
                    router.push(`/teacher/assignments/${submission.assignmentId}/submissions`)
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                돌아가기
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{submission.assignmentTitle}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{submission.studentName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>제출: {new Date(submission.submittedAt).toLocaleString('ko-KR')}</span>
                  </div>
                  <Badge variant={
                    submission.status === 'graded' ? 'default' :
                    submission.status === 'returned' ? 'secondary' : 'outline'
                  }>
                    {submission.status === 'graded' ? '채점 완료' :
                     submission.status === 'returned' ? '반환됨' : '채점 대기'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => saveGrading(false)} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                임시 저장
              </Button>
              <Button onClick={() => saveGrading(true)} disabled={isSaving}>
                <Send className="h-4 w-4 mr-2" />
                채점 완료
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="problems" className="space-y-6">
          <TabsList>
            <TabsTrigger value="problems">문제 검토</TabsTrigger>
            <TabsTrigger value="recording">녹화 영상</TabsTrigger>
            <TabsTrigger value="grading">종합 채점</TabsTrigger>
          </TabsList>

          {/* 문제 검토 탭 */}
          <TabsContent value="problems" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 문제 및 답안 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 문제 네비게이션 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">문제 {currentProblemIndex + 1}</h2>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentProblemIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentProblemIndex === 0}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      {currentProblemIndex + 1} / {submission.problems.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentProblemIndex(prev => Math.min(submission.problems.length - 1, prev + 1))}
                      disabled={currentProblemIndex === submission.problems.length - 1}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 문제 내용 - 학생의 필기가 포함된 캡처 이미지 또는 원본 문제 */}
                {(() => {
                  const currentProblemRecording = submission.problemRecordings?.find(
                    rec => rec.problemId === currentProblem?.id || rec.problemIndex === currentProblemIndex
                  )

                  return currentProblemRecording?.capturedImageUrl ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>학생 제출 답안 (필기 포함)</span>
                          <Badge variant="secondary">캡처 이미지</Badge>
                        </CardTitle>
                        <CardDescription>
                          학생이 문제를 풀면서 작성한 필기가 포함된 실제 제출 화면입니다.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="relative w-full bg-gray-50 rounded-lg border">
                          <img
                            src={currentProblemRecording.capturedImageUrl}
                            alt={`문제 ${currentProblemIndex + 1} 학생 답안`}
                            className="w-full h-auto rounded-lg"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ) : currentProblem ? (
                    <ProblemViewer
                      problem={currentProblem}
                      showMetadata={true}
                      showAnswerKey={true}
                    />
                  ) : null
                })()}
              </div>

              {/* 문제별 채점 */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">문제별 채점</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {submission.problems.map((problem, index) => (
                      <div
                        key={problem.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          index === currentProblemIndex
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setCurrentProblemIndex(index)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">문제 {index + 1}</span>
                          <Badge variant={
                            (problemScores[problem.id] || 0) >= 80 ? 'default' :
                            (problemScores[problem.id] || 0) >= 60 ? 'secondary' : 'destructive'
                          }>
                            {problemScores[problem.id] || 0}점
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">점수 (0-100)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={problemScores[problem.id] || 0}
                            onChange={(e) => handleProblemScoreChange(problem.id, parseInt(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 총점 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">총점</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {totalScore}점
                      </div>
                      <div className="text-sm text-gray-500">
                        최고점: {maxScore}점
                      </div>
                      <div className="mt-3">
                        <Progress value={(totalScore / maxScore) * 100} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 녹화 영상 탭 */}
          <TabsContent value="recording" className="space-y-6">
            {(() => {
              // 현재 문제의 녹화 데이터 가져오기
              const currentProblem = submission.problems[currentProblemIndex]
              const currentRecording = submission.problemRecordings?.find(
                rec => rec.problemId === currentProblem?.id || rec.problemIndex === currentProblemIndex
              )

              return (
                <>
                  {/* 활동 타임라인 - 현재 문제의 세그먼트 */}
                  {currentRecording?.segments && currentRecording.segments.length > 0 && (() => {
                    // 세그먼트들의 총 시간 계산 (최초 반응 시간이 첫 세그먼트에 포함됨)
                    const totalSegmentDuration = currentRecording.segments.reduce(
                      (sum, seg) => sum + (seg.duration || 0),
                      0
                    )

                    return (
                      <ActivityTimeline
                        segments={currentRecording.segments}
                        totalDuration={totalSegmentDuration}
                        firstReactionTime={currentRecording.firstReactionTime}
                      />
                    )
                  })()}

                  {/* 녹화 영상 - 현재 문제의 녹화 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        문제 {currentProblemIndex + 1} 풀이 과정 녹화
                      </CardTitle>
                      <CardDescription>
                        {currentRecording
                          ? `학생이 문제 ${currentProblemIndex + 1}을 푸는 과정이 녹화된 영상입니다`
                          : `문제 ${currentProblemIndex + 1}의 녹화 영상이 없습니다`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {currentRecording ? (
                        <div className="space-y-4">
                          <video
                            key={currentRecording.recordingUrl} // URL이 바뀔 때 비디오 재로드
                            className="w-full max-w-4xl mx-auto rounded-lg border"
                            controls
                          >
                            <source src={currentRecording.recordingUrl} type="video/webm" />
                            브라우저가 동영상을 지원하지 않습니다.
                          </video>

                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>녹화 시간: {formatTime(currentRecording.duration || 0)}</span>
                            <div className="flex gap-2">
                              {submission.problemRecordings && submission.problemRecordings.length > 0 && (
                                <span className="text-gray-500">
                                  (전체 {submission.problemRecordings.length}개 문제 중 {currentProblemIndex + 1}번)
                                </span>
                              )}
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                다운로드
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : submission.recordingUrl ? (
                        // 레거시: 전체 과제 녹화가 있는 경우
                        <div className="space-y-4">
                          <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">
                            ⚠️ 이 제출물은 문제별 녹화가 아닌 전체 과제 녹화 방식으로 저장되었습니다.
                          </div>
                          <video
                            className="w-full max-w-4xl mx-auto rounded-lg border"
                            controls
                          >
                            <source src={submission.recordingUrl} type="video/webm" />
                            브라우저가 동영상을 지원하지 않습니다.
                          </video>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>총 녹화 시간: {formatTime(submission.recordingDuration || 0)}</span>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              다운로드
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-12">
                          이 문제의 녹화 영상이 없습니다.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )
            })()}
          </TabsContent>

          {/* 종합 채점 탭 */}
          <TabsContent value="grading" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 피드백 작성 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>피드백 작성</span>
                  </CardTitle>
                  <CardDescription>
                    학생에게 전달할 피드백을 작성해주세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="학생의 문제 풀이에 대한 피드백을 작성해주세요..."
                    className="min-h-[200px]"
                  />
                </CardContent>
              </Card>

              {/* 채점 요약 */}
              <Card>
                <CardHeader>
                  <CardTitle>채점 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {submission.problems.map((problem, index) => (
                      <div key={problem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">문제 {index + 1}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold">
                            {problemScores[problem.id] || 0}점
                          </span>
                          {(problemScores[problem.id] || 0) >= 80 ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (problemScores[problem.id] || 0) >= 60 ? (
                            <Star className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>총점</span>
                    <span className="text-2xl text-blue-600">{totalScore}점</span>
                  </div>

                  <div className="text-center text-sm text-gray-500">
                    평균: {Math.round(totalScore / submission.problems.length)}점
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}