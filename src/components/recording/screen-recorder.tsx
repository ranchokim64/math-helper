"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Play,
  Square,
  Pause,
  Video,
  VideoOff,
  Download,
  Trash2,
  Monitor,
  AlertCircle,
  Clock
} from "lucide-react"
import { toast } from "sonner"

interface ScreenRecorderProps {
  onRecordingComplete?: (recordingBlob: Blob, duration: number) => void
  onRecordingStart?: () => void
  onRecordingStop?: () => void
  maxDuration?: number // 최대 녹화 시간 (초)
  className?: string
}

type RecordingState = "idle" | "starting" | "recording" | "paused" | "stopping" | "completed"

export function ScreenRecorder({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  maxDuration = 1800, // 기본 30분
  className = ""
}: ScreenRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // 녹화 시간 업데이트
  const updateTimer = useCallback(() => {
    if (startTimeRef.current > 0) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setRecordingDuration(duration)

      // 최대 시간 체크
      if (duration >= maxDuration) {
        stopRecording()
        toast.warning(`최대 녹화 시간(${Math.floor(maxDuration / 60)}분)에 도달했습니다.`)
      }
    }
  }, [maxDuration])

  // 녹화 시작
  const startRecording = async () => {
    try {
      setError(null)
      setRecordingState("starting")

      // 화면 캡처 요청
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      streamRef.current = stream
      chunksRef.current = []

      // MediaRecorder 설정
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp8,opus'
      }

      // 브라우저 지원 체크
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm'
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/mp4'
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      // 이벤트 리스너 설정
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: options.mimeType })
        const url = URL.createObjectURL(blob)

        setRecordedBlob(blob)
        setRecordedUrl(url)
        setRecordingState("completed")

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

        // 콜백 호출
        if (onRecordingComplete) {
          onRecordingComplete(blob, recordingDuration)
        }
        if (onRecordingStop) {
          onRecordingStop()
        }

        toast.success("화면 녹화가 완료되었습니다!")
      }

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder 오류:", event)
        setError("녹화 중 오류가 발생했습니다.")
        setRecordingState("idle")
        toast.error("녹화 중 오류가 발생했습니다.")
      }

      // 녹화 시작
      mediaRecorder.start(1000) // 1초마다 데이터 수집
      setRecordingState("recording")
      startTimeRef.current = Date.now()
      setRecordingDuration(0)

      // 타이머 시작
      timerRef.current = setInterval(updateTimer, 1000)

      if (onRecordingStart) {
        onRecordingStart()
      }

      toast.success("화면 녹화를 시작했습니다!")

      // 스트림 종료 감지 (사용자가 브라우저에서 공유 중지)
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          if (recordingState === "recording") {
            stopRecording()
          }
        })
      }

    } catch (error) {
      console.error("화면 녹화 시작 실패:", error)
      setRecordingState("idle")

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError("화면 공유 권한이 거부되었습니다.")
          toast.error("화면 공유 권한이 필요합니다.")
        } else if (error.name === 'NotSupportedError') {
          setError("이 브라우저는 화면 녹화를 지원하지 않습니다.")
          toast.error("브라우저가 화면 녹화를 지원하지 않습니다.")
        } else {
          setError("화면 녹화를 시작할 수 없습니다.")
          toast.error("화면 녹화 시작에 실패했습니다.")
        }
      }
    }
  }

  // 녹화 일시정지/재개
  const pauseResumeRecording = () => {
    if (!mediaRecorderRef.current) return

    if (recordingState === "recording") {
      mediaRecorderRef.current.pause()
      setRecordingState("paused")
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      toast.info("녹화를 일시정지했습니다.")
    } else if (recordingState === "paused") {
      mediaRecorderRef.current.resume()
      setRecordingState("recording")
      startTimeRef.current = Date.now() - (recordingDuration * 1000)
      timerRef.current = setInterval(updateTimer, 1000)
      toast.info("녹화를 재개했습니다.")
    }
  }

  // 녹화 중지
  const stopRecording = () => {
    if (!mediaRecorderRef.current) return

    setRecordingState("stopping")
    mediaRecorderRef.current.stop()
  }

  // 녹화 파일 다운로드
  const downloadRecording = () => {
    if (!recordedBlob || !recordedUrl) return

    const a = document.createElement('a')
    a.href = recordedUrl
    a.download = `screen-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    toast.success("녹화 파일을 다운로드했습니다!")
  }

  // 녹화 파일 삭제
  const deleteRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
    }
    setRecordedBlob(null)
    setRecordedUrl(null)
    setRecordingDuration(0)
    setRecordingState("idle")
    setError(null)
    chunksRef.current = []

    toast.success("녹화 파일을 삭제했습니다.")
  }

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const isRecording = recordingState === "recording"
  const isPaused = recordingState === "paused"
  const isCompleted = recordingState === "completed"
  const canStart = recordingState === "idle"
  const progressPercentage = (recordingDuration / maxDuration) * 100

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Video className="h-5 w-5" />
          <span>화면 녹화</span>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1" />
              녹화 중
            </Badge>
          )}
          {isPaused && (
            <Badge variant="secondary">일시정지</Badge>
          )}
        </CardTitle>
        <CardDescription>
          문제 풀이 과정을 화면 녹화로 기록합니다
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* 녹화 시간 및 진행률 */}
        {(isRecording || isPaused || isCompleted) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">
                  {formatTime(recordingDuration)} / {formatTime(maxDuration)}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* 녹화 제어 버튼 */}
        <div className="flex flex-wrap items-center gap-2">
          {canStart && (
            <Button onClick={startRecording} className="flex items-center space-x-2">
              <Monitor className="h-4 w-4" />
              <span>녹화 시작</span>
            </Button>
          )}

          {(isRecording || isPaused) && (
            <>
              <Button
                variant="outline"
                onClick={pauseResumeRecording}
                className="flex items-center space-x-2"
              >
                {isRecording ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span>일시정지</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>재개</span>
                  </>
                )}
              </Button>

              <Button
                variant="destructive"
                onClick={stopRecording}
                disabled={recordingState !== "recording" && recordingState !== "paused"}
                className="flex items-center space-x-2"
              >
                <Square className="h-4 w-4" />
                <span>녹화 중지</span>
              </Button>
            </>
          )}

          {isCompleted && recordedBlob && (
            <>
              <Button
                variant="outline"
                onClick={downloadRecording}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>다운로드</span>
              </Button>

              <Button
                variant="outline"
                onClick={deleteRecording}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>삭제</span>
              </Button>

              <Button
                onClick={startRecording}
                className="flex items-center space-x-2"
              >
                <Video className="h-4 w-4" />
                <span>새 녹화</span>
              </Button>
            </>
          )}
        </div>

        {/* 녹화 완료 시 미리보기 */}
        {isCompleted && recordedUrl && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">녹화 미리보기</h4>
            <video
              src={recordedUrl}
              controls
              className="w-full max-w-md rounded-lg border"
              style={{ maxHeight: '200px' }}
            >
              브라우저가 동영상 재생을 지원하지 않습니다.
            </video>
          </div>
        )}

        {/* 브라우저 지원 안내 */}
        {!navigator.mediaDevices?.getDisplayMedia && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              이 브라우저는 화면 녹화를 지원하지 않습니다. Chrome, Firefox, Safari 최신 버전을 사용해주세요.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}