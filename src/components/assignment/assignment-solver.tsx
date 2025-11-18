"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ProblemViewer } from "@/components/problem/problem-viewer"
import { useAutoRecording } from "@/hooks/use-auto-recording"
import { ProcessedProblem, ActivitySegment } from "@/types"
import { toast } from "sonner"
import { FullPageSpinner } from "@/components/ui/loading-spinner"

// RecordingData 타입 import (use-auto-recording에서 export 필요)
interface RecordingData {
  blob: Blob
  duration: number
  url: string
  segments?: ActivitySegment[]
  problemId?: string
  problemIndex?: number
  capturedImageBlob?: Blob  // 학생 필기가 포함된 캡처 이미지
  firstReactionTime?: number  // 최초 반응 시간 (초)
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
  const [backgroundCanvasElement, setBackgroundCanvasElement] = useState<HTMLCanvasElement | null>(null)
  const [compositeCanvasElement, setCompositeCanvasElement] = useState<HTMLCanvasElement | null>(null)

  // 합성 캔버스 애니메이션 프레임 ref (cleanup용)
  const compositeAnimationRef = useRef<number | null>(null)

  // 문제별 녹화 데이터 관리 (problemId -> RecordingData)
  const [problemRecordings, setProblemRecordings] = useState<Map<string, RecordingData>>(new Map())
  const [isTransitioning, setIsTransitioning] = useState(false)

  // 최초 반응 시간 추적
  const [currentFirstReaction, setCurrentFirstReaction] = useState<number | null>(null)

  // 자동 녹화 훅
  const {
    isRecording,
    isPaused,
    recordingDuration,
    recordedData,
    hasStarted: recordingStarted,
    startAutoRecording,
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
      const drawingTime = segments.filter(s => s.type === 'writing').reduce((sum, s) => sum + (s.duration || 0), 0)
      const pausedTime = segments.filter(s => s.type === 'paused').reduce((sum, s) => sum + (s.duration || 0), 0)

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

  // Canvas가 준비되면 호출됨 (필기 캔버스 + 배경 캔버스)
  const handleCanvasReady = (canvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => {
    console.log('🎨 Canvas 준비 완료:', { canvas, backgroundCanvas })
    setCanvasElement(canvas)
    setBackgroundCanvasElement(backgroundCanvas)
  }

  // 실시간 합성 캔버스 생성 및 녹화 시작
  useEffect(() => {
    if (!canvasElement || !backgroundCanvasElement) return

    console.log('🎬 합성 캔버스 생성 시작')

    // 합성 캔버스 생성
    const compositeCanvas = document.createElement('canvas')
    compositeCanvas.width = canvasElement.width
    compositeCanvas.height = canvasElement.height
    const ctx = compositeCanvas.getContext('2d')

    if (!ctx) {
      console.error('❌ 합성 캔버스 context를 가져올 수 없습니다')
      return
    }

    // 실시간 합성 함수
    const updateComposite = () => {
      // 1. 배경 캔버스 그리기 (문제 이미지 + 마스킹)
      ctx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height)
      ctx.drawImage(backgroundCanvasElement, 0, 0)

      // 2. 필기 캔버스 위에 그리기
      ctx.drawImage(canvasElement, 0, 0)

      // 다음 프레임 예약
      compositeAnimationRef.current = requestAnimationFrame(updateComposite)
    }

    // 합성 시작
    updateComposite()
    setCompositeCanvasElement(compositeCanvas)

    console.log('✅ 합성 캔버스 생성 완료:', {
      width: compositeCanvas.width,
      height: compositeCanvas.height
    })

    // Cleanup
    return () => {
      if (compositeAnimationRef.current) {
        cancelAnimationFrame(compositeAnimationRef.current)
        compositeAnimationRef.current = null
      }
      setCompositeCanvasElement(null)
    }
  }, [canvasElement, backgroundCanvasElement])

  // 합성 캔버스가 준비되면 녹화 시작
  useEffect(() => {
    if (!compositeCanvasElement || !currentProblem || recordingStarted) return
    if (!assignment?.problems || assignment.problems.length === 0) return

    console.log('🎬 합성 캔버스로 자동 녹화 시작', {
      problemId: currentProblem.id,
      problemIndex: currentProblemIndex
    })

    startAutoRecording(compositeCanvasElement, currentProblem.id, currentProblemIndex)
  }, [compositeCanvasElement, currentProblem, recordingStarted, assignment, currentProblemIndex, startAutoRecording])

  // 두 캔버스를 합성하여 이미지로 캡처 (배경 + 필기)
  const captureCanvasImage = (
    drawingCanvas: HTMLCanvasElement,
    backgroundCanvas: HTMLCanvasElement
  ): Promise<Blob | null> => {
    return new Promise((resolve) => {
      try {
        // 임시 캔버스 생성
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = drawingCanvas.width
        tempCanvas.height = drawingCanvas.height

        const ctx = tempCanvas.getContext('2d')
        if (!ctx) {
          console.error('❌ Canvas context를 가져올 수 없습니다')
          resolve(null)
          return
        }

        // 1. 배경 캔버스 먼저 그리기 (문제 이미지 + 마스킹)
        ctx.drawImage(backgroundCanvas, 0, 0)

        // 2. 필기 캔버스 위에 그리기
        ctx.drawImage(drawingCanvas, 0, 0)

        // 3. 합성된 이미지를 Blob으로 변환
        tempCanvas.toBlob((blob) => {
          if (blob) {
            console.log('📸 Canvas 합성 캡처 완료:', {
              size: blob.size,
              type: blob.type,
              width: tempCanvas.width,
              height: tempCanvas.height
            })
          } else {
            console.error('❌ Canvas 캡처 실패')
          }
          resolve(blob)
        }, 'image/png') // PNG 형식으로 투명도 지원
      } catch (error) {
        console.error('❌ Canvas 캡처 오류:', error)
        resolve(null)
      }
    })
  }

  // 최초 반응 시간 콜백
  const handleFirstReaction = (seconds: number) => {
    console.log('⚡ 최초 반응 시간:', seconds)
    setCurrentFirstReaction(seconds)
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
      let stoppedRecordingData: RecordingData | null = null
      if (isRecording || isPaused) {
        console.log('🛑 녹화 중지 (문제 전환):', {
          from: currentProblemIndex,
          to: targetIndex,
          currentRecordedData: recordedData ? {
            duration: recordedData.duration,
            hasSegments: !!recordedData.segments,
            segmentsCount: recordedData.segments?.length || 0
          } : null
        })

        // stopRecording은 이제 Promise를 반환하며, onstop 완료 시 RecordingData를 반환
        stoppedRecordingData = await stopRecording()

        console.log('⏹️ 녹화 중지 완료 후:', {
          hasStoppedData: !!stoppedRecordingData,
          stoppedDataInfo: stoppedRecordingData ? {
            duration: stoppedRecordingData.duration,
            hasSegments: !!stoppedRecordingData.segments,
            segmentsCount: stoppedRecordingData.segments?.length || 0,
            segments: stoppedRecordingData.segments
          } : null
        })
      }

      // 2. 현재 문제의 녹화 데이터 저장 (있다면)
      // stopRecording()이 반환한 데이터 사용 (recordedData가 아직 업데이트되지 않았을 수 있음)
      let dataToSave = stoppedRecordingData || recordedData

      // Canvas 캡처 및 firstReaction 추가 (학생이 본 화면 그대로: 문제 이미지 + 필기)
      if (dataToSave && canvasElement && backgroundCanvasElement) {
        const capturedBlob = await captureCanvasImage(canvasElement, backgroundCanvasElement)
        if (capturedBlob) {
          dataToSave = {
            ...dataToSave,
            capturedImageBlob: capturedBlob,
            firstReactionTime: currentFirstReaction || undefined
          }
        } else {
          dataToSave = {
            ...dataToSave,
            firstReactionTime: currentFirstReaction || undefined
          }
        }
      } else if (dataToSave) {
        dataToSave = {
          ...dataToSave,
          firstReactionTime: currentFirstReaction || undefined
        }
      }

      console.log('🔍 녹화 데이터 저장 체크:', {
        hasStoppedData: !!stoppedRecordingData,
        hasRecordedData: !!recordedData,
        hasDataToSave: !!dataToSave,
        currentProblemId: currentProblem?.id,
        dataToSaveDetails: dataToSave ? {
          duration: dataToSave.duration,
          hasBlob: !!dataToSave.blob,
          blobSize: dataToSave.blob?.size || 0,
          hasSegments: !!dataToSave.segments,
          segmentsCount: dataToSave.segments?.length || 0,
          segments: dataToSave.segments,
          hasCapturedImage: !!dataToSave.capturedImageBlob,
          capturedImageSize: dataToSave.capturedImageBlob?.size || 0
        } : null
      })

      if (dataToSave && currentProblem) {
        setProblemRecordings(prev => {
          const newMap = new Map(prev)
          newMap.set(currentProblem.id, dataToSave)
          console.log('💾 문제 녹화 저장:', {
            problemId: currentProblem.id,
            problemIndex: currentProblemIndex,
            duration: dataToSave.duration,
            hasSegments: !!dataToSave.segments,
            segmentsCount: dataToSave.segments?.length || 0,
            segments: dataToSave.segments,
            hasCapturedImage: !!dataToSave.capturedImageBlob,
            totalRecordings: newMap.size
          })
          return newMap
        })
      } else {
        console.warn('⚠️ 녹화 데이터 저장 실패 - dataToSave 또는 currentProblem 없음')
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
      setCurrentFirstReaction(null)  // 최초 반응 시간도 초기화

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
      console.log('📤 제출 시작:', {
        isRecording,
        isPaused,
        hasRecordedData: !!recordedData,
        currentProblemId: currentProblem?.id
      })

      let stoppedRecordingData: RecordingData | null = null
      if (isRecording || isPaused) {
        console.log('🛑 제출 전 녹화 중지')
        // stopRecording은 이제 Promise를 반환하며, onstop 완료 시 RecordingData를 반환
        stoppedRecordingData = await stopRecording()

        console.log('⏹️ 제출 전 녹화 중지 완료:', {
          hasStoppedData: !!stoppedRecordingData,
          stoppedDataInfo: stoppedRecordingData ? {
            duration: stoppedRecordingData.duration,
            hasBlob: !!stoppedRecordingData.blob,
            hasSegments: !!stoppedRecordingData.segments,
            segmentsCount: stoppedRecordingData.segments?.length || 0,
            segments: stoppedRecordingData.segments
          } : null
        })
      }

      // 현재 문제의 최종 녹화 데이터 저장
      // stopRecording()이 반환한 데이터 사용 (recordedData가 아직 업데이트되지 않았을 수 있음)
      let dataToSave = stoppedRecordingData || recordedData

      // Canvas 캡처 및 firstReaction 추가 (마지막 문제: 문제 이미지 + 필기)
      if (dataToSave && canvasElement && backgroundCanvasElement) {
        const capturedBlob = await captureCanvasImage(canvasElement, backgroundCanvasElement)
        if (capturedBlob) {
          dataToSave = {
            ...dataToSave,
            capturedImageBlob: capturedBlob,
            firstReactionTime: currentFirstReaction || undefined
          }
        } else {
          dataToSave = {
            ...dataToSave,
            firstReactionTime: currentFirstReaction || undefined
          }
        }
      } else if (dataToSave) {
        dataToSave = {
          ...dataToSave,
          firstReactionTime: currentFirstReaction || undefined
        }
      }

      if (dataToSave && currentProblem) {
        console.log('💾 제출 시 현재 문제 녹화 저장:', {
          problemId: currentProblem.id,
          hasSegments: !!dataToSave.segments,
          segmentsCount: dataToSave.segments?.length || 0,
          segments: dataToSave.segments,
          hasCapturedImage: !!dataToSave.capturedImageBlob
        })
        setProblemRecordings(prev => {
          const newMap = new Map(prev)
          newMap.set(currentProblem.id, dataToSave)
          return newMap
        })
      } else {
        console.warn('⚠️ 제출 시 녹화 데이터 없음')
      }

      // 모든 문제별 녹화 데이터 수집
      console.log('🔍 제출 전 상태 확인:', {
        problemRecordingsSize: problemRecordings.size,
        problemRecordingsKeys: Array.from(problemRecordings.keys()),
        hasStoppedData: !!stoppedRecordingData,
        hasRecordedData: !!recordedData,
        hasDataToSave: !!dataToSave,
        currentProblemId: currentProblem?.id,
        dataToSaveInfo: dataToSave ? {
          duration: dataToSave.duration,
          hasBlob: !!dataToSave.blob,
          hasSegments: !!dataToSave.segments,
          segmentsCount: dataToSave.segments?.length || 0
        } : null
      })

      const finalRecordings = new Map(problemRecordings)
      if (dataToSave && currentProblem) {
        finalRecordings.set(currentProblem.id, dataToSave)
        console.log('✅ 현재 문제 녹화 데이터 finalRecordings에 추가:', {
          problemId: currentProblem.id,
          hasSegments: !!dataToSave.segments,
          segmentsCount: dataToSave.segments?.length || 0
        })
      }

      console.log('📤 제출할 녹화 데이터:', {
        totalProblems: assignment.problems.length,
        recordedProblems: finalRecordings.size,
        problemIds: Array.from(finalRecordings.keys()),
        finalRecordingsDetails: Array.from(finalRecordings.entries()).map(([id, data]) => ({
          problemId: id,
          duration: data.duration,
          hasBlob: !!data.blob,
          blobSize: data.blob?.size || 0,
          hasSegments: !!data.segments,
          segmentsCount: data.segments?.length || 0
        }))
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

      console.log('📋 sortedRecordings 필터링 결과:', {
        totalProblems: assignment.problems.length,
        recordedCount: sortedRecordings.length,
        details: assignment.problems.map((problem, index) => ({
          index,
          problemId: problem.id,
          hasRecording: !!finalRecordings.get(problem.id)
        }))
      })

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

            console.log(`📋 문제 ${index + 1} Segments 추가:`, {
              hasSegments: true,
              segmentsCount: recording.segments.length,
              segments: recording.segments,
              jsonString: JSON.stringify(recording.segments)
            })
          } else {
            console.warn(`⚠️ 문제 ${index + 1} Segments 없음!`)
          }

          // firstReactionTime 추가
          if (recording.firstReactionTime !== undefined) {
            formData.append(`recording_${index}_firstReaction`, recording.firstReactionTime.toString())
            console.log(`⚡ 문제 ${index + 1} 최초 반응 시간:`, recording.firstReactionTime)
          }

          // 캡처 이미지 추가
          if (recording.capturedImageBlob) {
            formData.append(`captured_image_${index}`, recording.capturedImageBlob, `problem_${index}.jpg`)

            console.log(`📸 문제 ${index + 1} 캡처 이미지 추가:`, {
              hasCapturedImage: true,
              imageSize: recording.capturedImageBlob.size,
              imageType: recording.capturedImageBlob.type
            })
          } else {
            console.warn(`⚠️ 문제 ${index + 1} 캡처 이미지 없음!`)
          }

          // 세그먼트 정보 로깅
          const segments = recording.segments || []
          const writingTime = segments.filter(s => s.type === 'writing').reduce((sum, s) => sum + (s.duration || 0), 0)
          const erasingTime = segments.filter(s => s.type === 'erasing').reduce((sum, s) => sum + (s.duration || 0), 0)
          const thinkingTime = segments.filter((s, idx) => s.type === 'paused' && idx !== 0).reduce((sum, s) => sum + (s.duration || 0), 0)
          const firstReaction = segments.length > 0 && segments[0]!.type === 'paused' ? (segments[0]!.duration || 0) : 0

          console.log(`📊 문제 ${index + 1} 학습 활동:`)
          console.log('- 총 시간:', formatTime(recording.duration))
          console.log('- 최초 반응:', formatTime(firstReaction))
          console.log('- 필기 시간:', formatTime(writingTime))
          console.log('- 고민 시간:', formatTime(thinkingTime))
          console.log('- 지우기:', formatTime(erasingTime))
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
    return <FullPageSpinner />
  }

  if (!assignment || !currentProblem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-red-600">과제를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const progress = ((currentProblemIndex + 1) / assignment.problems.length) * 100

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Compact Header */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="default"
              onClick={() => router.back()}
              className="h-10 px-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{assignment.title}</h1>
              <p className="text-base text-gray-500">{assignment.className}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {assignment.dueDate && (
              <div className="hidden sm:flex items-center space-x-1 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{new Date(assignment.dueDate).toLocaleDateString('ko-KR')}</span>
              </div>
            )}
            <Badge variant="outline" className="text-base px-3 py-1">
              {currentProblemIndex + 1} / {assignment.problems.length}
            </Badge>
          </div>
        </div>

        {/* Compact Progress Bar */}
        <div className="px-4 pb-2">
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content - 스크롤 없이 꽉 채우기 */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* 문제 영역 - 전체 화면 활용 */}
          <div className="flex-1 flex flex-col px-2 py-2 overflow-hidden">
            {/* 문제 뷰어 (필기 기능 통합) - flex-1로 남은 공간 모두 차지 */}
            <div className="flex-1 overflow-hidden mb-2">
              <ProblemViewer
                problem={currentProblem}
                showMetadata={false}
                showAnswerKey={false}
                className="h-full w-full"
                enableDrawing={true}
                onFirstDraw={handleFirstDraw}
                onFirstReaction={handleFirstReaction}
                disabled={isSubmitting}
                onSegmentChange={startNewSegment}
                onCanvasReady={handleCanvasReady}
              />
            </div>

            {/* 하단 네비게이션 - 컴팩트 */}
            <div className="flex items-center justify-between flex-shrink-0 gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={goToPrevious}
                disabled={currentProblemIndex === 0 || isTransitioning}
                className="h-11 text-base"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline ml-1">이전</span>
              </Button>

              <div className="flex space-x-2 overflow-x-auto max-w-[400px]">
                {assignment.problems.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleProblemTransition(index)}
                    disabled={isTransitioning}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center text-base cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                      index === currentProblemIndex
                        ? 'border-blue-500 bg-blue-500 text-white font-semibold'
                        : 'border-gray-300 bg-white text-gray-600'
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
                disabled={currentProblemIndex === assignment.problems.length - 1 || isTransitioning}
                className="h-11 text-base"
              >
                <span className="hidden sm:inline mr-1">다음</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* 사이드바 - 모바일에서는 하단, 태블릿 이상에서는 우측 */}
          <div className="lg:w-72 lg:border-l border-t lg:border-t-0 flex-shrink-0 p-3 space-y-3 overflow-y-auto">
            {/* 녹화 상태 표시 */}
            {(isRecording || isPaused || recordedData) && (
              <Card className="border-2 border-red-100">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    {isRecording ? (
                      <>
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                        <span>녹화 중</span>
                        <Badge variant="destructive" className="text-sm">
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
                      <div>필기: {Math.floor(recordedData.segments.filter(s => s.type === 'writing').reduce((sum, s) => sum + (s.duration || 0), 0) / 60)}분</div>
                      <div>고민: {Math.floor(recordedData.segments.filter(s => s.type === 'paused').reduce((sum, s) => sum + (s.duration || 0), 0) / 60)}분</div>
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