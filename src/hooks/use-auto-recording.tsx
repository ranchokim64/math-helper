"use client"

import { useState, useRef, useCallback } from "react"
import { toast } from "sonner"
import { ActivitySegment } from "@/types"

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

type RecordingState = "idle" | "starting" | "recording" | "paused" | "stopping" | "completed" | "error"

// 재풀이 판단 임계값 (초)
const REWORK_THRESHOLD_SECONDS = 3

interface UseAutoRecordingOptions {
  maxDuration?: number
  onRecordingComplete?: (data: RecordingData) => void
  onRecordingStart?: () => void
  onRecordingStop?: () => void
}

export function useAutoRecording({
  maxDuration = 3600, // 1시간
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop
}: UseAutoRecordingOptions = {}) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordedData, setRecordedData] = useState<RecordingData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const hasStartedRef = useRef(false)
  const problemIdRef = useRef<string | null>(null)
  const problemIndexRef = useRef<number | null>(null)
  const stopPromiseResolveRef = useRef<((data: RecordingData) => void) | null>(null)

  // 활동 세그먼트 추적
  const segmentsRef = useRef<ActivitySegment[]>([])
  const currentSegmentRef = useRef<ActivitySegment | null>(null)
  const pauseStartTimeRef = useRef<number>(0)

  // 타이머 업데이트
  const updateTimer = useCallback(() => {
    if (startTimeRef.current > 0) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setRecordingDuration(duration)

      if (duration >= maxDuration) {
        stopRecording()
        toast.warning(`최대 녹화 시간(${Math.floor(maxDuration / 60)}분)에 도달했습니다.`)
      }
    }
  }, [maxDuration])

  // 자동 녹화 시작 (Canvas captureStream 사용)
  const startAutoRecording = useCallback(async (
    canvas?: HTMLCanvasElement,
    problemId?: string,
    problemIndex?: number
  ) => {
    if (hasStartedRef.current || recordingState !== "idle") {
      console.log('녹화 시작 불가:', { hasStarted: hasStartedRef.current, state: recordingState })
      return // 이미 시작됨
    }

    try {
      hasStartedRef.current = true
      setError(null)
      setRecordingState("starting")

      // 문제 정보 저장
      problemIdRef.current = problemId || null
      problemIndexRef.current = problemIndex !== undefined ? problemIndex : null

      console.log('🎬 Canvas 녹화 시작 중...', { problemId, problemIndex })

      if (!canvas) {
        throw new Error('Canvas element is required for recording')
      }

      // Canvas에서 MediaStream 생성 (30fps)
      const stream = canvas.captureStream(30)

      if (!stream) {
        throw new Error('Failed to capture stream from canvas')
      }

      console.log('✅ Canvas 스트림 생성 완료')

      streamRef.current = stream
      chunksRef.current = []

      // MediaRecorder 설정
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp8'
      }

      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm'
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/mp4'
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      // 이벤트 리스너
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // 최종 duration 계산 (시작 시간부터 현재까지)
        const finalDuration = startTimeRef.current > 0
          ? Math.floor((Date.now() - startTimeRef.current) / 1000)
          : 0

        const blob = new Blob(chunksRef.current, { type: options.mimeType })
        const url = URL.createObjectURL(blob)
        const data: RecordingData = {
          blob,
          duration: finalDuration,
          url,
          segments: [...segmentsRef.current],
          problemId: problemIdRef.current || undefined,
          problemIndex: problemIndexRef.current !== null ? problemIndexRef.current : undefined
        }

        setRecordedData(data)
        setRecordingState("completed")
        setRecordingDuration(finalDuration) // 최종 duration 업데이트

        // 정리
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        onRecordingComplete?.(data)
        onRecordingStop?.()

        console.log('🎬 녹화 완료:', {
          duration: finalDuration,
          segments: segmentsRef.current.length,
          blobSize: blob.size,
          세그먼트상세: segmentsRef.current.map(s => ({
            타입: s.type,
            시간: s.duration + '초'
          }))
        })

        toast.success(`문제 풀이 과정이 녹화되었습니다! (${Math.floor(finalDuration / 60)}분 ${finalDuration % 60}초)`)

        // stopRecording Promise resolve
        if (stopPromiseResolveRef.current) {
          console.log('✅ stopRecording Promise resolve')
          stopPromiseResolveRef.current(data)
          stopPromiseResolveRef.current = null
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder 오류:", event)
        setError("녹화 중 오류가 발생했습니다.")
        setRecordingState("error")
        hasStartedRef.current = false
        toast.error("녹화 중 오류가 발생했습니다.")
      }

      // 녹화 시작
      mediaRecorder.start(1000)
      setRecordingState("recording")
      startTimeRef.current = Date.now()
      setRecordingDuration(0)

      // 녹화 시작 시 즉시 'paused' 세그먼트 생성 (최초 반응 시간 기록용)
      // 첫 드로잉 시작 시 이 세그먼트가 종료되고 'writing' 세그먼트가 시작됨
      currentSegmentRef.current = {
        type: 'paused',
        startTime: Date.now()
      }

      // 타이머 시작
      timerRef.current = setInterval(updateTimer, 1000)

      console.log('🎬 녹화 시작:', {
        startTime: startTimeRef.current,
        mimeType: options.mimeType,
        fps: 30
      })

      onRecordingStart?.()
      toast.success("문제 풀이 과정 녹화를 시작했습니다!")

    } catch (error) {
      console.error("자동 녹화 시작 실패:", error)
      setRecordingState("error")
      hasStartedRef.current = false

      if (error instanceof Error) {
        setError(error.message)
        toast.error(`녹화 시작에 실패했습니다: ${error.message}`)
      } else {
        setError("알 수 없는 오류가 발생했습니다.")
        toast.error("녹화 시작에 실패했습니다.")
      }
    }
  }, [recordingState, updateTimer, onRecordingStart, onRecordingComplete, onRecordingStop])

  // 현재 세그먼트 종료
  const endCurrentSegment = useCallback(() => {
    if (currentSegmentRef.current) {
      const endTime = Date.now()
      const durationMs = endTime - currentSegmentRef.current.startTime
      const duration = Math.floor(durationMs / 1000)

      const completedSegment: ActivitySegment = {
        ...currentSegmentRef.current,
        endTime,
        duration,
        metadata: currentSegmentRef.current.metadata
      }

      // 지우기 세그먼트이고 임계값 이상이면 재풀이로 표시
      if (completedSegment.type === 'erasing' && duration >= REWORK_THRESHOLD_SECONDS) {
        completedSegment.metadata = {
          ...completedSegment.metadata,
          isRework: true
        }
      }

      // 1초 미만 세그먼트 병합 로직 (짧은 스트로크 반복 시 0초 세그먼트 방지)
      if (durationMs < 1000 && segmentsRef.current.length > 0) {
        const lastSegment = segmentsRef.current[segmentsRef.current.length - 1]

        // 이전 세그먼트와 같은 타입이면 병합
        if (lastSegment && lastSegment.type === completedSegment.type) {
          lastSegment.endTime = endTime
          lastSegment.duration = Math.floor((endTime - lastSegment.startTime) / 1000)

          console.log('🔗 짧은 세그먼트 병합:', {
            타입: completedSegment.type,
            병합된시간: durationMs + 'ms',
            새로운총시간: lastSegment.duration + '초'
          })

          currentSegmentRef.current = null
          return
        }
      }

      console.log('✅ 세그먼트 종료:', {
        타입: completedSegment.type,
        시간: duration + '초',
        밀리초: durationMs + 'ms',
        전체세그먼트수: segmentsRef.current.length + 1
      })

      segmentsRef.current.push(completedSegment)
      currentSegmentRef.current = null
    }
  }, [])

  // 새 세그먼트 시작
  const startNewSegment = useCallback((type: 'writing' | 'erasing' | 'paused') => {
    // 중복 호출 방지: 이미 같은 타입의 세그먼트가 진행 중이면 무시
    if (currentSegmentRef.current?.type === type) {
      console.log('⚠️ 세그먼트 중복 호출 방지:', {
        현재세그먼트: currentSegmentRef.current?.type,
        요청된타입: type,
        무시됨: true
      })
      return
    }

    console.log('📌 세그먼트 전환:', {
      이전세그먼트: currentSegmentRef.current?.type,
      새세그먼트: type,
      현재시간: new Date().toISOString()
    })

    // 기존 세그먼트가 있으면 종료
    endCurrentSegment()

    // 새 세그먼트 시작
    currentSegmentRef.current = {
      type,
      startTime: Date.now()
    }
  }, [endCurrentSegment])

  // 녹화 일시정지
  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || recordingState !== "recording") {
      return
    }

    try {
      mediaRecorder.pause()
      setRecordingState("paused")
      pauseStartTimeRef.current = Date.now()

      // drawing 세그먼트 종료하고 paused 세그먼트 시작
      startNewSegment('paused')

      console.log("녹화 일시정지")
    } catch (error) {
      console.error("녹화 일시정지 실패:", error)
    }
  }, [recordingState, startNewSegment])

  // 녹화 재개
  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || recordingState !== "paused") {
      return
    }

    try {
      mediaRecorder.resume()
      setRecordingState("recording")

      // paused 세그먼트 종료하고 writing 세그먼트 시작
      startNewSegment('writing')

      console.log("녹화 재개")
    } catch (error) {
      console.error("녹화 재개 실패:", error)
    }
  }, [recordingState, startNewSegment])

  // 녹화 중지
  const stopRecording = useCallback((): Promise<RecordingData | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || (recordingState !== "recording" && recordingState !== "paused")) {
        console.log('녹화 중지 불가:', { state: recordingState, hasRecorder: !!mediaRecorderRef.current })
        resolve(null)
        return
      }

      console.log('🛑 녹화 중지 요청:', {
        state: recordingState,
        segments: segmentsRef.current.length
      })

      // Promise resolve 함수 저장
      stopPromiseResolveRef.current = (data) => {
        resolve(data)
      }

      // 현재 세그먼트 종료
      endCurrentSegment()

      setRecordingState("stopping")
      mediaRecorderRef.current.stop()
    })
  }, [recordingState, endCurrentSegment])

  // 초기화
  const resetRecording = useCallback(() => {
    if (recordedData?.url) {
      URL.revokeObjectURL(recordedData.url)
    }

    // 모든 상태 초기화
    setRecordedData(null)
    setRecordingDuration(0)
    setRecordingState("idle")
    setError(null)
    hasStartedRef.current = false
    chunksRef.current = []
    problemIdRef.current = null
    problemIndexRef.current = null

    // 세그먼트 초기화
    segmentsRef.current = []
    currentSegmentRef.current = null
    pauseStartTimeRef.current = 0

    // 타이머 정리
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [recordedData])

  // 시간 포맷팅
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }, [])

  return {
    // 상태
    recordingState,
    recordingDuration,
    recordedData,
    error,
    isRecording: recordingState === "recording",
    isPaused: recordingState === "paused",
    isCompleted: recordingState === "completed",
    hasStarted: hasStartedRef.current,

    // 액션
    startAutoRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    startNewSegment,

    // 유틸리티
    formatTime
  }
}