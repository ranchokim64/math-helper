"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ProblemViewer } from "@/components/problem/problem-viewer"
import { useAutoRecording } from "@/hooks/use-auto-recording"
import { ProcessedProblem } from "@/types"
import { toast } from "sonner"

// RecordingData 타입 import (use-auto-recording에서 export 필요)
interface RecordingData {
  blob: Blob
  duration: number
  url: string
  segments?: any[]
  problemId?: string
  problemIndex?: number
}
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Clock,
  BookOpen
} from "lucide-react"

interface AssignmentSolverProps {
  assignmentId: string
  studentId: string
}

interface AssignmentData {
  id: string
  title: string
  description?: string
  dueDate?: string
  className: string
  problems: ProcessedProblem[]
}

export function AssignmentSolver({ assignmentId }: AssignmentSolverProps) {
  const router = useRouter()

  const [assignment, setAssignment] = useState<AssignmentData | null>(null)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)

  // 문제별 녹화 데이터 관리 (problemId -> RecordingData)
  const [problemRecordings, setProblemRecordings] = useState<Map<string, RecordingData>>(new Map())
  const [isTransitioning, setIsTransitioning] = useState(false)

  // 자동 녹화 훅
  const {
    isRecording,
    isPaused,
    recordingDuration,
    recordedData,
    hasStarted: recordingStarted,
    startAutoRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    startNewSegment,
    formatTime
  } = useAutoRecording({
    maxDuration: 3600, // 1시간
    onRecordingStart: () => {
      toast.info("문제 풀이 과정 녹화가 시작되었습니다!")
    },
    onRecordingComplete: (data) => {
      const segments = data.segments || []
      const drawingTime = segments.filter((s: any) => s.type === 'drawing').reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
      const pausedTime = segments.filter((s: any) => s.type === 'paused').reduce((sum: number, s: any) => sum + (s.duration || 0), 0)

      toast.success(`문제 풀이 과정이 녹화되었습니다! (필기: ${Math.floor(drawingTime / 60)}분, 고민: ${Math.floor(pausedTime / 60)}분)`)
    }
  })

  // 과제 데이터 로드
  useEffect(() => {
    const loadAssignment = async () => {
      try {
        // 실제 API 호출
        const response = await fetch(`/api/student/assignments/${assignmentId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch assignment')
        }

        const data = await response.json()
        setAssignment(data)

        // 자동 녹화 시작 (문제가 있을 때만, Canvas가 준비된 경우)
        // Note: Canvas가 준비되면 onCanvasReady에서 시작됨

      } catch (error) {
        console.error('Error loading assignment:', error)
        toast.error('과제를 불러오는 중 오류가 발생했습니다.')

        // 오류 발생시 더미 데이터로 폴백
        const mockAssignment: AssignmentData = {
          id: assignmentId,
          title: "곱셈 문제 풀이",
          description: "2자리 수와 1자리 수의 곱셈 문제를 풀어보세요",
          dueDate: "2024-01-20T23:59:59",
          className: "수학 3-1반",
          problems: [
            {
              id: "S3_초등_3_008547",
              imageUrl: "/problems/S3_초등_3_008547.png",
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

        setAssignment(mockAssignment)
      } finally {
        setIsLoading(false)
      }
    }

    loadAssignment()
  }, [assignmentId, router])

  const currentProblem = assignment?.problems[currentProblemIndex]

  // Canvas가 준비되면 호출됨
  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    console.log('🎨 Canvas 준비 완료:', canvas)
    setCanvasElement(canvas)

    // Canvas가 준비되면 자동으로 녹화 시작 (현재 문제 정보와 함께)
    if (!recordingStarted && assignment?.problems && assignment.problems.length > 0 && currentProblem) {
      console.log('🎬 Canvas 준비 완료 - 자동 녹화 시작', {
        problemId: currentProblem.id,
        problemIndex: currentProblemIndex
      })
      startAutoRecording(canvas, currentProblem.id, currentProblemIndex)
    }
  }

  // 첫 번째 그리기 시 자동 녹화 시작 (폴백)
  const handleFirstDraw = () => {
    if (!recordingStarted && canvasElement && currentProblem) {
      console.log('🎬 첫 번째 드로잉 - 녹화 시작', {
        problemId: currentProblem.id,
        problemIndex: currentProblemIndex
      })
      startAutoRecording(canvasElement, currentProblem.id, currentProblemIndex)
    }
  }

  // 문제 전환 처리 (녹화 중단/재시작 포함)
  const handleProblemTransition = async (targetIndex: number) => {
    if (!assignment || isTransitioning) return

    const targetProblem = assignment.problems[targetIndex]
    if (!targetProblem) return // 타입 가드

    setIsTransitioning(true)

    try {
      // 1. 현재 녹화 중이면 중지
      if (isRecording || isPaused) {
        console.log('🛑 녹화 중지 (문제 전환):', {
          from: currentProblemIndex,
          to: targetIndex
        })
        stopRecording()

        // stopRecording이 비동기적으로 완료되기를 기다림 (녹화 완료 콜백 후)
        // recordedData가 설정될 때까지 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // 2. 현재 문제의 녹화 데이터 저장 (있다면)
      if (recordedData && currentProblem) {
        setProblemRecordings(prev => {
          const newMap = new Map(prev)
          newMap.set(currentProblem.id, recordedData)
          console.log('💾 문제 녹화 저장:', {
            problemId: currentProblem.id,
            problemIndex: currentProblemIndex,
            duration: recordedData.duration
          })
          return newMap
        })
      }

      // 3. 목표 문제에 이미 녹화 기록이 있는지 확인
      const existingRecording = problemRecordings.get(targetProblem.id)

      if (existingRecording) {
        // 재방문 확인 대화상자
        const confirmed = window.confirm(
          `이 문제는 이미 풀이한 기록이 있습니다.\n` +
          `(녹화 시간: ${Math.floor(existingRecording.duration / 60)}분 ${existingRecording.duration % 60}초)\n\n` +
          `처음부터 다시 풀이하시겠습니까?\n\n` +
          `[확인]: 이전 녹화를 삭제하고 다시 녹화합니다.\n` +
          `[취소]: 문제 전환을 취소합니다.`
        )

        if (!confirmed) {
          // 전환 취소 - 현재 문제 유지
          console.log('❌ 문제 전환 취소')
          setIsTransitioning(false)
          return
        }

        // 확인 시 이전 녹화 삭제
        setProblemRecordings(prev => {
          const newMap = new Map(prev)
          newMap.delete(targetProblem.id)
          console.log('🗑️ 이전 녹화 삭제:', targetProblem.id)

          // URL 객체 정리
          if (existingRecording.url) {
            URL.revokeObjectURL(existingRecording.url)
          }

          return newMap
        })
      }

      // 4. 녹화 상태 초기화 (새 문제 녹화 준비)
      resetRecording()

      // 5. 문제 전환
      console.log('➡️ 문제 전환:', {
        from: currentProblemIndex,
        to: targetIndex,
        targetProblemId: targetProblem.id
      })
      setCurrentProblemIndex(targetIndex)

      // 6. Canvas가 준비되면 handleCanvasReady에서 자동으로 녹화 시작됨

    } catch (error) {
      console.error('문제 전환 오류:', error)
      toast.error('문제 전환 중 오류가 발생했습니다.')
    } finally {
      setIsTransitioning(false)
    }
  }

  // 전체 과제 제출
  const submitAssignment = async () => {
    if (!assignment) return

    setIsSubmitting(true)
    try {
      // 녹화 중이면 중지하고 현재 문제 녹화 저장
      if (isRecording || isPaused) {
        stopRecording()
        // 중지 완료 대기
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // 현재 문제의 최종 녹화 데이터 저장
      if (recordedData && currentProblem) {
        setProblemRecordings(prev => {
          const newMap = new Map(prev)
          newMap.set(currentProblem.id, recordedData)
          return newMap
        })
      }

      // 모든 문제별 녹화 데이터 수집
      const finalRecordings = new Map(problemRecordings)
      if (recordedData && currentProblem) {
        finalRecordings.set(currentProblem.id, recordedData)
      }

      console.log('📤 제출할 녹화 데이터:', {
        totalProblems: assignment.problems.length,
        recordedProblems: finalRecordings.size,
        problemIds: Array.from(finalRecordings.keys())
      })

      // API 호출 - FormData에 문제별 녹화 추가
      const formData = new FormData()

      // 문제별 녹화 파일 추가 (문제 번호 순서대로 정렬)
      const sortedRecordings = assignment.problems
        .map((problem, index) => ({
          problem,
          index,
          recording: finalRecordings.get(problem.id)
        }))
        .filter(item => item.recording) // 녹화가 있는 것만

      sortedRecordings.forEach(({ problem, index, recording }) => {
        if (recording) {
          // 문제별 녹화 파일 추가
          formData.append(`recording_${index}`, recording.blob, `problem_${index}.webm`)

          // 메타데이터 추가
          formData.append(`recording_${index}_problemId`, problem.id)
          formData.append(`recording_${index}_problemIndex`, index.toString())
          formData.append(`recording_${index}_duration`, recording.duration.toString())

          if (recording.segments) {
            formData.append(`recording_${index}_segments`, JSON.stringify(recording.segments))
          }

          // 세그먼트 정보 로깅
          const segments = recording.segments || []
          const drawingTime = segments.filter((s: any) => s.type === 'drawing').reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
          const pausedTime = segments.filter((s: any) => s.type === 'paused').reduce((sum: number, s: any) => sum + (s.duration || 0), 0)

          console.log(`📊 문제 ${index + 1} 학습 활동:`)
          console.log('- 총 시간:', formatTime(recording.duration))
          console.log('- 필기 시간:', formatTime(drawingTime))
          console.log('- 고민 시간:', formatTime(pausedTime))
        }
      })

      // 녹화된 문제 개수 추가
      formData.append('recordedProblemsCount', sortedRecordings.length.toString())

      const response = await fetch(`/api/student/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Submit error response:', errorData)
        throw new Error(errorData.details || 'Failed to submit assignment')
      }

      const result = await response.json()
      console.log('Submit success:', result)

      const recordingInfo = sortedRecordings.length > 0
        ? `녹화 포함 (${sortedRecordings.length}개 문제)`
        : "녹화 없음"
      toast.success(`과제가 성공적으로 제출되었습니다! (${recordingInfo})`)

      // 녹화 URL 정리
      finalRecordings.forEach(recording => {
        if (recording.url) {
          URL.revokeObjectURL(recording.url)
        }
      })

      router.push("/student")
    } catch (error) {
      toast.error("제출 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 이전/다음 문제
  const goToPrevious = () => {
    const targetIndex = Math.max(0, currentProblemIndex - 1)
    if (targetIndex !== currentProblemIndex) {
      handleProblemTransition(targetIndex)
    }
  }

  const goToNext = () => {
    if (!assignment) return
    const targetIndex = Math.min(assignment.problems.length - 1, currentProblemIndex + 1)
    if (targetIndex !== currentProblemIndex) {
      handleProblemTransition(targetIndex)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">과제를 불러오는 중...</div>
      </div>
    )
  }

  if (!assignment || !currentProblem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">과제를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const progress = ((currentProblemIndex + 1) / assignment.problems.length) * 100

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
                <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
                <p className="text-gray-600">{assignment.className}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {assignment.dueDate && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>마감: {new Date(assignment.dueDate).toLocaleString('ko-KR')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">진행률</span>
            <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* 문제 영역 - 더 넓게 */}
          <div className="lg:col-span-4 space-y-6">
            {/* 문제 헤더 */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>문제 {currentProblemIndex + 1}</span>
              </h2>
              <Badge variant="outline" className="text-sm">
                {currentProblemIndex + 1} / {assignment.problems.length}
              </Badge>
            </div>

            {/* 문제 뷰어 (필기 기능 통합) */}
            <ProblemViewer
              problem={currentProblem}
              showMetadata={true}
              showAnswerKey={false}
              className="border-2 border-blue-100"
              enableDrawing={true}
              onFirstDraw={handleFirstDraw}
              disabled={isSubmitting}
              onRecordingPause={pauseRecording}
              onRecordingResume={resumeRecording}
              onSegmentChange={startNewSegment}
              onCanvasReady={handleCanvasReady}
            />

            {/* 네비게이션 */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentProblemIndex === 0 || isTransitioning}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                이전 문제
              </Button>

              <div className="flex space-x-2">
                {assignment.problems.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleProblemTransition(index)}
                    disabled={isTransitioning}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${
                      index === currentProblemIndex
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={goToNext}
                disabled={currentProblemIndex === assignment.problems.length - 1 || isTransitioning}
              >
                다음 문제
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* 정답 입력 및 제출 패널 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 녹화 상태 표시 */}
            {(isRecording || isPaused || recordedData) && (
              <Card className="border-2 border-red-100">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    {isRecording ? (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span>녹화 중</span>
                        <Badge variant="destructive" className="text-xs">
                          {formatTime(recordingDuration)}
                        </Badge>
                      </>
                    ) : isPaused ? (
                      <>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        <span>일시정지</span>
                        <Badge variant="secondary" className="text-xs">
                          {formatTime(recordingDuration)}
                        </Badge>
                      </>
                    ) : recordedData ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <span>녹화 완료</span>
                        <Badge variant="default" className="text-xs">
                          {formatTime(recordedData.duration)}
                        </Badge>
                      </>
                    ) : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-gray-500">
                    {isRecording
                      ? "문제 풀이 과정이 녹화되고 있습니다."
                      : isPaused
                      ? "녹화가 일시정지되었습니다. (필기 시 자동 재개)"
                      : "문제 풀이 과정이 녹화되었습니다."
                    }
                  </p>
                  {recordedData?.segments && (
                    <div className="mt-2 text-xs text-gray-400">
                      <div>필기: {Math.floor(recordedData.segments.filter((s: any) => s.type === 'drawing').reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / 60)}분</div>
                      <div>고민: {Math.floor(recordedData.segments.filter((s: any) => s.type === 'paused').reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / 60)}분</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 과제 제출 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center">과제 제출</CardTitle>
                <CardDescription className="text-center">
                  모든 문제를 풀었다면 제출해주세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="text-xs text-gray-500">
                    {recordedData
                      ? `✓ 녹화 완료 (${formatTime(recordedData.duration)})`
                      : isRecording
                      ? `🔴 녹화 중... (${formatTime(recordingDuration)})`
                      : recordingStarted
                      ? "녹화 준비 완료"
                      : "첫 번째 필기 시 자동 녹화 시작"
                    }
                  </div>
                  <Button
                    onClick={submitAssignment}
                    disabled={isSubmitting}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? (
                      "제출 중..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        과제 제출하기
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}