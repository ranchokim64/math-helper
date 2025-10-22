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
}

type RecordingState = "idle" | "starting" | "recording" | "paused" | "stopping" | "completed" | "error"

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
          blobSize: blob.size
        })

        toast.success(`문제 풀이 과정이 녹화되었습니다! (${Math.floor(finalDuration / 60)}분 ${finalDuration % 60}초)`)
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

      // 첫 번째 drawing 세그먼트 시작
      currentSegmentRef.current = {
        type: 'drawing',
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
      const duration = Math.floor((endTime - currentSegmentRef.current.startTime) / 1000)

      const completedSegment: ActivitySegment = {
        ...currentSegmentRef.current,
        endTime,
        duration
      }

      segmentsRef.current.push(completedSegment)
      currentSegmentRef.current = null
    }
  }, [])

  // 새 세그먼트 시작
  const startNewSegment = useCallback((type: 'drawing' | 'paused' | 'answering') => {
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

      // paused 세그먼트 종료하고 drawing 세그먼트 시작
      startNewSegment('drawing')

      console.log("녹화 재개")
    } catch (error) {
      console.error("녹화 재개 실패:", error)
    }
  }, [recordingState, startNewSegment])

  // 녹화 중지
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || (recordingState !== "recording" && recordingState !== "paused")) {
      console.log('녹화 중지 불가:', { state: recordingState, hasRecorder: !!mediaRecorderRef.current })
      return
    }

    console.log('🛑 녹화 중지 요청:', {
      state: recordingState,
      segments: segmentsRef.current.length
    })

    // 현재 세그먼트 종료
    endCurrentSegment()

    setRecordingState("stopping")
    mediaRecorderRef.current.stop()
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