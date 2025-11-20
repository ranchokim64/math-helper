"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProcessedProblem } from "@/types"
import { DrawingToolbar, DrawingTool } from "@/components/canvas/drawing-toolbar"
import {
  ImageIcon,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Eye,
  EyeOff
} from "lucide-react"

// KaTeX 동적 import
import dynamic from "next/dynamic"
const InlineMath = dynamic(() => import("react-katex").then(mod => mod.InlineMath), {
  ssr: false,
  loading: () => <span className="inline-block w-4 h-4 bg-gray-200 animate-pulse rounded" />
})
const BlockMath = dynamic(() => import("react-katex").then(mod => mod.BlockMath), {
  ssr: false,
  loading: () => <div className="w-full h-8 bg-gray-200 animate-pulse rounded" />
})

interface ProblemViewerProps {
  problem: ProcessedProblem
  showMetadata?: boolean
  showAnswerKey?: boolean
  className?: string
  enableDrawing?: boolean
  onDrawingChange?: (hasDrawing: boolean) => void
  onFirstDraw?: () => void
  onFirstReaction?: (seconds: number) => void  // 최초 반응 시간 콜백
  disabled?: boolean
  isAnswering?: boolean
  onRecordingPause?: () => void
  onRecordingResume?: () => void
  onSegmentChange?: (type: 'writing' | 'erasing' | 'paused') => void
  onCanvasReady?: (canvas: HTMLCanvasElement, backgroundCanvas: HTMLCanvasElement) => void
  nextProblemImageUrl?: string  // 다음 문제 이미지 프리페치용
}

interface MathContent {
  type: "text" | "inline-math" | "block-math"
  content: string
}

type DrawingStatus = 'idle' | 'writing' | 'erasing' | 'paused' | 'completed'

interface Stroke {
  tool: DrawingTool
  color: string
  width: number
  points: { x: number; y: number }[]
}

export function ProblemViewer({
  problem,
  showMetadata = true,
  showAnswerKey = false,
  className = "",
  enableDrawing = false,
  onDrawingChange,
  onFirstDraw,
  onFirstReaction,
  disabled = false,
  isAnswering = false,
  onRecordingPause,
  onRecordingResume,
  onSegmentChange,
  onCanvasReady,
  nextProblemImageUrl
}: ProblemViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)
  const [katexLoaded, setKatexLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)

  // 캔버스 관련 상태
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingStatus, setDrawingStatus] = useState<DrawingStatus>('idle')
  const canvasRef = useRef<HTMLCanvasElement>(null) // 그리기 캔버스 (학생 필기)
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null) // 배경 캔버스 (문제 이미지 + 마스킹)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const loadedImageRef = useRef<HTMLImageElement | null>(null)
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentStrokeRef = useRef<Stroke | null>(null) // 실시간 그리기용 ref

  // 최초 반응 시간 추적용 ref
  const problemLoadTimeRef = useRef<number>(0)
  const firstDrawTimeRef = useRef<number>(0)
  const hasReportedFirstReaction = useRef<boolean>(false)

  // 드로잉 툴바 상태
  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen')
  const [lineWidth, setLineWidth] = useState(2)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [historyStep, setHistoryStep] = useState(0)

  // 안전한 URL 인코딩 함수
  const encodeImageUrl = useCallback((url: string): string => {
    try {
      // URL에 한글 문자가 있으면 인코딩
      const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(url)
      if (hasKorean) {
        const encodedUrl = encodeURI(url)
        console.log("🔍 Image URL encoding:", { original: url, encoded: encodedUrl })
        return encodedUrl
      }
      // 한글이 없으면 그대로 반환
      console.log("🔍 Image URL (no encoding needed):", url)
      return url
    } catch (error) {
      console.warn("이미지 URL 인코딩 실패:", error)
      return url
    }
  }, [])

  // 배경 캔버스 렌더링 (문제 이미지 + 마스킹 레이어)
  const renderBackgroundCanvas = useCallback(() => {
    const canvas = backgroundCanvasRef.current
    const ctx = canvas?.getContext('2d')
    const container = imageContainerRef.current
    if (!canvas || !ctx || !container) return

    // CSS 크기 가져오기 (논리적 픽셀)
    const rect = container.getBoundingClientRect()
    const canvasWidth = rect.width
    const canvasHeight = rect.height

    // Canvas 크기가 0이면 렌더링하지 않음 (초기화 타이밍 문제 방지)
    if (canvasWidth === 0 || canvasHeight === 0) {
      console.warn('⚠️ Canvas 크기가 0입니다. 렌더링을 건너뜁니다.', { canvasWidth, canvasHeight })
      return
    }

    // 캔버스 클리어 (전체 픽셀 크기로)
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvasWidth * dpr, canvasHeight * dpr)

    // 1. 배경 이미지 그리기
    const img = loadedImageRef.current
    if (img && img.complete && imageDimensions) {
      // 이미지를 Canvas 크기에 맞춰 그리기 (논리적 픽셀 사용)
      const imgWidth = imageDimensions.width
      const imgHeight = imageDimensions.height

      // aspect ratio 유지하며 contain 방식으로 그리기
      const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight)
      const scaledWidth = imgWidth * scale
      const scaledHeight = imgHeight * scale
      const x = (canvasWidth - scaledWidth) / 2
      const y = (canvasHeight - scaledHeight) / 2

      ctx.drawImage(img, x, y, scaledWidth, scaledHeight)

      // 2. 마스킹 레이어 그리기 (학생 모드에서만)
      if (!showAnswerKey && problem.sections && imageDimensions) {
        const answerSections = problem.sections.filter(
          (section) =>
            (section.type === 'answer' || section.type === 'explanation') &&
            section.boundingBox &&
            Array.isArray(section.boundingBox) &&
            section.boundingBox.length > 0
        )

        answerSections.forEach((section) => {
          const bbox = section.boundingBox![0]
          if (!bbox || bbox.length < 4) return

          const x1 = bbox[0]
          const y1 = bbox[1]
          const x2 = bbox[2]
          const y2 = bbox[3]
          if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return

          const width = x2 - x1
          const height = y2 - y1

          // 이미지 좌표를 Canvas 좌표로 변환
          const maskX = x + (x1 * scale)
          const maskY = y + (y1 * scale)
          const maskWidth = width * scale
          const maskHeight = height * scale

          // 마스크 사각형 그리기 - 하얀색으로 완전히 가림
          ctx.fillStyle = 'rgba(255, 255, 255, 1)'
          ctx.fillRect(maskX, maskY, maskWidth, maskHeight)
        })
      }
    }

    // 배경 캔버스 업데이트 시 드로잉 캔버스에 이벤트 발생 (합성 캔버스 업데이트용)
    const drawingCanvas = canvasRef.current
    if (drawingCanvas) {
      drawingCanvas.dispatchEvent(new CustomEvent('drawing-updated'))
    }
  }, [showAnswerKey, problem.sections, imageDimensions])

  // 캔버스 크기 조정 (고해상도 디스플레이 지원)
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const backgroundCanvas = backgroundCanvasRef.current
    const container = imageContainerRef.current
    if (canvas && backgroundCanvas && container) {
      const rect = container.getBoundingClientRect()

      // Canvas 크기가 0이면 크기 조정하지 않음 (초기화 타이밍 문제 방지)
      if (rect.width === 0 || rect.height === 0) {
        console.warn('⚠️ Canvas 크기가 0입니다. 크기 조정을 건너뜁니다.', { width: rect.width, height: rect.height })
        return
      }

      const dpr = window.devicePixelRatio || 1

      // 두 캔버스 모두 동일한 크기로 설정
      const canvases = [canvas, backgroundCanvas]
      canvases.forEach(cvs => {
        // 실제 픽셀 크기 설정 (고해상도 디스플레이 지원)
        cvs.width = rect.width * dpr
        cvs.height = rect.height * dpr

        // CSS 크기는 논리적 픽셀로 설정
        cvs.style.width = rect.width + 'px'
        cvs.style.height = rect.height + 'px'

        // Canvas context를 dpr로 스케일링
        const ctx = cvs.getContext('2d')
        if (ctx) {
          ctx.scale(dpr, dpr)
        }
      })

      console.log('📐 Canvas 크기 조정:', {
        cssWidth: rect.width,
        cssHeight: rect.height,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        dpr
      })

      // 배경 캔버스 렌더링
      renderBackgroundCanvas()
    }
  }, [renderBackgroundCanvas])

  // 10초 타이머 초기화
  const resetPauseTimer = () => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }
  }

  // 3초 타이머 시작 (짧은 필기 간격은 같은 세그먼트로 유지)
  const startPauseTimer = () => {
    resetPauseTimer()
    pauseTimerRef.current = setTimeout(() => {
      // 3초 동안 아무 액션이 없으면 진짜 고민 중으로 판단
      setDrawingStatus('paused')
    }, 3000) // 3초
  }

  // 캔버스에 스트로크 그리기
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return

    ctx.beginPath()
    ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y)

    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y)
    }

    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = stroke.width * 3 // 지우개는 더 넓게
    } else {
      ctx.globalCompositeOperation = 'source-over'
    }

    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over' // 리셋
  }

  // 그리기 캔버스 렌더링 (학생 필기만)
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const container = imageContainerRef.current
    if (!canvas || !ctx || !container) return

    // CSS 크기 가져오기 (논리적 픽셀)
    const rect = container.getBoundingClientRect()
    const canvasWidth = rect.width
    const canvasHeight = rect.height

    // 캔버스 클리어 (전체 픽셀 크기로)
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvasWidth * dpr, canvasHeight * dpr)

    // 히스토리 스텝까지의 모든 스트로크 다시 그리기
    for (let i = 0; i < historyStep; i++) {
      drawStroke(ctx, strokes[i]!)
    }

    // 현재 그리고 있는 스트로크도 그리기 (ref 사용)
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      drawStroke(ctx, currentStrokeRef.current)
    }
  }, [strokes, historyStep])

  // Undo 기능
  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1)
    }
  }

  // Redo 기능
  const handleRedo = () => {
    if (historyStep < strokes.length) {
      setHistoryStep(historyStep + 1)
    }
  }

  // 전체 지우기
  const handleClear = () => {
    setStrokes([])
    setHistoryStep(0)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  // 캔버스 드로잉 이벤트 핸들러
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!enableDrawing || disabled) return

    setIsDrawing(true)

    // 현재 도구에 따라 상태 구분
    const newStatus = currentTool === 'eraser' ? 'erasing' : 'writing'

    // 3초 내에 다시 그리면 타이머 취소 (같은 세그먼트 유지)
    resetPauseTimer()

    // 이미 같은 상태면 세그먼트 전환하지 않음 (짧은 스트로크 반복 시 0초 세그먼트 방지)
    if (drawingStatus !== newStatus) {
      setDrawingStatus(newStatus)
    }

    // 첫 번째 드로잉 시
    if (drawingStatus === 'idle') {
      // 최초 반응 시간 계산 및 콜백 호출
      if (problemLoadTimeRef.current > 0 && !hasReportedFirstReaction.current && onFirstReaction) {
        firstDrawTimeRef.current = Date.now()
        const firstReactionSeconds = (firstDrawTimeRef.current - problemLoadTimeRef.current) / 1000
        onFirstReaction(firstReactionSeconds)
        hasReportedFirstReaction.current = true
      }

      // 녹화 시작 콜백
      if (onFirstDraw) {
        onFirstDraw()
      }

      // 주의: 세그먼트 전환은 useEffect(drawingStatus)에서 자동 처리됨
      // 여기서 onSegmentChange를 직접 호출하면 중복 호출로 0초 세그먼트가 생성됨
    }

    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY

      const newStroke: Stroke = {
        tool: currentTool,
        color: '#3b82f6',
        width: lineWidth,
        points: [{ x: clientX - rect.left, y: clientY - rect.top }]
      }

      setCurrentStroke(newStroke)
      currentStrokeRef.current = newStroke // ref에도 저장
    }

    if (onDrawingChange) {
      onDrawingChange(true)
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !enableDrawing || disabled || !currentStroke) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0]!.clientY : e.clientY

      const newPoint = { x: clientX - rect.left, y: clientY - rect.top }
      const updatedStroke = {
        ...currentStroke,
        points: [...currentStroke.points, newPoint]
      }

      setCurrentStroke(updatedStroke)
      currentStrokeRef.current = updatedStroke // ref에도 동기화

      // 실시간 그리기
      ctx.beginPath()
      const lastPoint = currentStroke.points[currentStroke.points.length - 1]!
      ctx.moveTo(lastPoint.x, lastPoint.y)
      ctx.lineTo(newPoint.x, newPoint.y)
      ctx.strokeStyle = currentStroke.color
      ctx.lineWidth = currentStroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (currentStroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = currentStroke.width * 3
      } else {
        ctx.globalCompositeOperation = 'source-over'
      }

      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'

      // 드로잉 업데이트 이벤트 발생 (합성 캔버스 업데이트용)
      canvas.dispatchEvent(new CustomEvent('drawing-updated'))
    }
  }

  const stopDrawing = useCallback(() => {
    if (isDrawing && currentStroke) {
      setIsDrawing(false)

      // 현재 스트로크를 히스토리에 추가
      const newStrokes = strokes.slice(0, historyStep)
      newStrokes.push(currentStroke)

      // 상태 업데이트
      setStrokes(newStrokes)
      setHistoryStep(newStrokes.length)
      setCurrentStroke(null)
      currentStrokeRef.current = null // ref도 초기화

      // 그리기 캔버스만 재렌더링 (배경은 별도 캔버스에서 관리됨)
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      const container = imageContainerRef.current

      if (canvas && ctx && container) {
        // CSS 크기 가져오기 (논리적 픽셀)
        const rect = container.getBoundingClientRect()
        const canvasWidth = rect.width
        const canvasHeight = rect.height

        // 캔버스 클리어
        const dpr = window.devicePixelRatio || 1
        ctx.clearRect(0, 0, canvasWidth * dpr, canvasHeight * dpr)

        // 모든 스트로크 다시 그리기 (새로운 스트로크 포함)
        for (let i = 0; i < newStrokes.length; i++) {
          drawStroke(ctx, newStrokes[i]!)
        }

        // 드로잉 업데이트 이벤트 발생 (합성 캔버스 업데이트용)
        canvas.dispatchEvent(new CustomEvent('drawing-updated'))
      }

      // 드로잉 중지 시 즉시 paused로 전환하지 않음 (짧은 스트로크 반복 시 0초 세그먼트 생성 방지)
      // 3초 타이머가 만료되면 그때 paused로 전환 (진짜 고민 시간만 기록)
      startPauseTimer()
    }
  }, [isDrawing, currentStroke, strokes, historyStep])

  // drawingStatus 변경 시 세그먼트 전환 (녹화는 계속 진행)
  useEffect(() => {
    if (!enableDrawing) return

    switch (drawingStatus) {
      case 'writing':
        // 펜으로 필기 중
        if (onSegmentChange) {
          onSegmentChange('writing')
        }
        break

      case 'erasing':
        // 지우개 사용 중
        if (onSegmentChange) {
          onSegmentChange('erasing')
        }
        break

      case 'paused':
        // 고민 시간 (드로잉 안 함)
        if (onSegmentChange) {
          onSegmentChange('paused')
        }
        break

      case 'idle':
      case 'completed':
        // 아무 작업도 하지 않음
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawingStatus, enableDrawing])

  // 드로잉 중 도구 변경 시 세그먼트 전환
  useEffect(() => {
    if (isDrawing && drawingStatus !== 'paused' && drawingStatus !== 'idle' && drawingStatus !== 'completed') {
      const newStatus = currentTool === 'eraser' ? 'erasing' : 'writing'
      if (drawingStatus !== newStatus) {
        setDrawingStatus(newStatus)
      }
    }
  }, [currentTool, isDrawing, drawingStatus])

  // 히스토리 스텝 변경 시 캔버스 다시 그리기
  useEffect(() => {
    if (enableDrawing) {
      redrawCanvas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyStep, enableDrawing])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      resetPauseTimer()
    }
  }, [])

  // 문제 변경 시 드로잉 상태 초기화
  useEffect(() => {
    console.log('🔄 문제 변경 감지 - 드로잉 상태 초기화:', problem.id)

    // 모든 드로잉 상태 초기화
    setStrokes([])
    setHistoryStep(0)
    setCurrentStroke(null)
    currentStrokeRef.current = null // ref도 초기화
    setIsDrawing(false)
    setDrawingStatus('idle')
    resetPauseTimer()

    // Canvas 클리어
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [problem.id])

  useEffect(() => {
    // KaTeX CSS는 layout.tsx에서 정적으로 로드되므로 즉시 사용 가능
    setKatexLoaded(true)
  }, [])

  // 다음 문제 이미지 프리페치 (성능 최적화)
  useEffect(() => {
    if (!nextProblemImageUrl || !imageLoaded) return

    // 현재 문제 이미지 로드 완료 후 다음 문제 이미지 프리페치
    const prefetchImage = document.createElement('img') as HTMLImageElement
    const encodedUrl = encodeImageUrl(nextProblemImageUrl)
    const isExternal = encodedUrl.startsWith('http://') || encodedUrl.startsWith('https://')
    const isSupabase = encodedUrl.includes('supabase.co')

    // 현재 이미지와 동일한 최적화 전략 사용
    const optimizedUrl = (isExternal && isSupabase)
      ? `/_next/image?url=${encodeURIComponent(encodedUrl)}&w=1920&q=85`
      : encodedUrl

    prefetchImage.src = optimizedUrl
    console.log('🔄 다음 문제 이미지 프리페치:', optimizedUrl)

    // Cleanup
    return () => {
      prefetchImage.src = ''
    }
  }, [nextProblemImageUrl, imageLoaded, encodeImageUrl])

  // 이미지 로드 및 Canvas 초기 렌더링 (성능 최적화: Next.js Image API 사용)
  useEffect(() => {
    if (!problem.imageUrl) return

    // 문제 로드 시작 시점 기록 (최초 반응 시간 측정용)
    // 이미지 다운로드 시작 = 사용자가 문제를 보기 시작하는 시점
    problemLoadTimeRef.current = Date.now()
    hasReportedFirstReaction.current = false

    // 이미지 로딩 시작 시 Canvas 숨김 (이전 문제의 정답 노출 방지)
    setImageLoaded(false)

    const img = document.createElement('img') as HTMLImageElement
    img.crossOrigin = 'anonymous' // CORS 허용

    // 이미지 URL 최적화 (외부 이미지는 Next.js Image API 사용)
    const encodedUrl = encodeImageUrl(problem.imageUrl)
    const isExternal = encodedUrl.startsWith('http://') || encodedUrl.startsWith('https://')
    const isSupabase = encodedUrl.includes('supabase.co')

    // Supabase 이미지는 Next.js Image API로 최적화, 로컬/API 이미지는 그대로 사용
    const optimizedUrl = (isExternal && isSupabase)
      ? `/_next/image?url=${encodeURIComponent(encodedUrl)}&w=1920&q=85`
      : encodedUrl

    img.src = optimizedUrl

    img.onload = () => {
      loadedImageRef.current = img
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
      setImageError(false)

      console.log('✅ 이미지 로드 완료:', { width: img.naturalWidth, height: img.naturalHeight })

      // Canvas 크기 조정 및 마스킹 렌더링을 먼저 완료
      // requestAnimationFrame으로 다음 프레임에 실행하여 레이아웃 안정화
      requestAnimationFrame(() => {
        resizeCanvas()
        redrawCanvas()

        // 마스킹까지 모두 그려진 후에 Canvas 표시 (정답 노출 방지)
        requestAnimationFrame(() => {
          setImageLoaded(true)

          // Canvas가 준비되면 콜백 호출 (필기 캔버스 + 배경 캔버스)
          if (onCanvasReady && canvasRef.current && backgroundCanvasRef.current) {
            onCanvasReady(canvasRef.current, backgroundCanvasRef.current)
          }
        })
      })
    }

    img.onerror = () => {
      console.error('이미지 로드 실패')
      setImageError(true)
      setImageLoaded(true)
    }

    return () => {
      // cleanup
      if (loadedImageRef.current) {
        loadedImageRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.imageUrl])

  // showAnswerKey 또는 showFullImage 변경 시 재렌더링
  useEffect(() => {
    if (imageLoaded && loadedImageRef.current) {
      if (showFullImage) {
        resizeCanvas()
      }
      redrawCanvas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFullImage, showAnswerKey, imageLoaded])

  // 배경 캔버스 렌더링 (이미지 로드, 답안 표시 변경 시)
  useEffect(() => {
    if (imageLoaded && loadedImageRef.current && imageDimensions) {
      renderBackgroundCanvas()
    }
  }, [showAnswerKey, imageLoaded, imageDimensions, renderBackgroundCanvas])

  // 윈도우 리사이즈 시 캔버스 크기 조정 및 재렌더링
  useEffect(() => {
    const handleResize = () => {
      resizeCanvas()
      redrawCanvas()
    }

    if (enableDrawing) {
      window.addEventListener('resize', handleResize)
    }
    return () => {
      if (enableDrawing) {
        window.removeEventListener('resize', handleResize)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableDrawing])

  // LaTeX 수식을 감지하고 파싱하는 함수
  const parseLatexContent = (text: string): MathContent[] => {
    const parts: MathContent[] = []
    let currentIndex = 0

    // 블록 수식 패턴: $$...$$
    const blockPattern = /\$\$(.*?)\$\$/g
    // 인라인 수식 패턴: $...$
    const inlinePattern = /\$(.*?)\$/g

    let match: RegExpExecArray | null
    const allMatches: { start: number, end: number, type: "block" | "inline", content: string }[] = []

    // 블록 수식 찾기
    while ((match = blockPattern.exec(text)) !== null) {
      allMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: "block",
        content: match[1]?.trim() || ""
      })
    }

    // 인라인 수식 찾기 (블록 수식과 겹치지 않는 것만)
    inlinePattern.lastIndex = 0 // 패턴 리셋
    while ((match = inlinePattern.exec(text)) !== null) {
      const isInsideBlock = allMatches.some(blockMatch =>
        match!.index >= blockMatch.start && match!.index < blockMatch.end
      )
      if (!isInsideBlock && match[1]?.trim()) {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: "inline",
          content: match[1].trim()
        })
      }
    }

    // 위치순으로 정렬
    allMatches.sort((a, b) => a.start - b.start)

    // 텍스트 분할
    for (const match of allMatches) {
      // 앞의 텍스트 추가
      if (currentIndex < match.start) {
        const textContent = text.slice(currentIndex, match.start).trim()
        if (textContent) {
          parts.push({ type: "text", content: textContent })
        }
      }

      // 수식 추가
      parts.push({
        type: match.type === "block" ? "block-math" : "inline-math",
        content: match.content
      })

      currentIndex = match.end
    }

    // 남은 텍스트 추가
    if (currentIndex < text.length) {
      const textContent = text.slice(currentIndex).trim()
      if (textContent) {
        parts.push({ type: "text", content: textContent })
      }
    }

    return parts.length > 0 ? parts : [{ type: "text", content: text }]
  }

  // 텍스트 렌더링 함수
  const renderTextContent = (content: string) => {
    if (!katexLoaded) {
      return <span>{content}</span>
    }

    const parts = parseLatexContent(content)

    return (
      <span>
        {parts.map((part, index) => {
          switch (part.type) {
            case "inline-math":
              try {
                return <InlineMath key={index} math={part.content} />
              } catch (error) {
                console.warn("인라인 수식 렌더링 오류:", error)
                return <span key={index} className="bg-red-100 text-red-600 px-1 rounded text-sm">수식 오류: {part.content}</span>
              }
            case "block-math":
              try {
                return <BlockMath key={index} math={part.content} />
              } catch (error) {
                console.warn("블록 수식 렌더링 오류:", error)
                return <div key={index} className="bg-red-100 text-red-600 p-2 rounded text-sm">수식 오류: {part.content}</div>
              }
            default:
              return <span key={index}>{part.content}</span>
          }
        })}
      </span>
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '하'
      case 'medium': return '중'
      case 'hard': return '상'
      default: return difficulty
    }
  }

  return (
    <Card className={`w-full ${className}`}>
      {showMetadata && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{problem.grade} {problem.semester}</Badge>
            <Badge variant="outline">{problem.subject}</Badge>
            <Badge className={getDifficultyColor(problem.difficulty)}>
              {getDifficultyLabel(problem.difficulty)}
            </Badge>
            <Badge variant="outline">
              {problem.type === 'multiple_choice' ? '객관식' : '주관식'}
            </Badge>
            {problem.metadata?.source_data_name && (
              <Badge variant="secondary" className="text-xs">
                {problem.metadata.source_data_name}
              </Badge>
            )}
          </div>
        </div>
      )}

      <CardContent className="p-6">
        <div className="space-y-6">
          {/* 문제 이미지가 있으면 먼저 표시 */}
          {problem.imageUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">문제 이미지</span>
                  {!showAnswerKey && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      문제만 표시
                    </Badge>
                  )}
                </div>
                {/* 크게보기 버튼은 드로잉 모드가 아닐 때만 표시 */}
                {!enableDrawing && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullImage(!showFullImage)}
                    >
                      {showFullImage ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showFullImage ? '숨기기' : '크게 보기'}
                    </Button>
                  </div>
                )}
              </div>

              {/* 드로잉 툴바 (드로잉 모드일 때만) */}
              {enableDrawing && (
                <DrawingToolbar
                  currentTool={currentTool}
                  onToolChange={setCurrentTool}
                  lineWidth={lineWidth}
                  onLineWidthChange={setLineWidth}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onClear={handleClear}
                  canUndo={historyStep > 0}
                  canRedo={historyStep < strokes.length}
                  disabled={disabled}
                />
              )}

              <div
                ref={imageContainerRef}
                className={`relative bg-gray-100 rounded-lg overflow-hidden ${
                  enableDrawing
                    ? 'h-full min-h-[400px]' // 드로잉 모드: 부모 높이 사용 + 최소 높이 보장
                    : showFullImage
                      ? 'min-h-[400px]'
                      : 'min-h-[200px]'
                } ${enableDrawing ? 'cursor-crosshair' : ''}`}
              >
                {!imageLoaded && !imageError && (
                  <Skeleton className="w-full h-full absolute inset-0" />
                )}

                {imageError && (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <ImageIcon className="h-8 w-8 mb-2" />
                    <p className="text-sm">이미지를 불러올 수 없습니다</p>
                    <p className="text-xs text-gray-400 mt-1">URL: {problem.imageUrl}</p>
                  </div>
                )}

                {/* 배경 캔버스 - 문제 이미지 + 마스킹 레이어 (지우개로부터 보호됨) */}
                <canvas
                  ref={backgroundCanvasRef}
                  className={`absolute inset-0 w-full h-full ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  } transition-opacity duration-200 pointer-events-none`}
                  style={{
                    zIndex: 0
                  }}
                />

                {/* 그리기 캔버스 - 학생 필기 전용 (지우개가 이 레이어만 영향) */}
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full ${
                    enableDrawing ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
                  }`}
                  style={{
                    touchAction: enableDrawing ? 'none' : 'auto',
                    zIndex: 1
                  }}
                  onMouseDown={enableDrawing ? startDrawing : undefined}
                  onMouseMove={enableDrawing ? draw : undefined}
                  onMouseUp={enableDrawing ? stopDrawing : undefined}
                  onMouseLeave={enableDrawing ? stopDrawing : undefined}
                  onTouchStart={enableDrawing ? startDrawing : undefined}
                  onTouchMove={enableDrawing ? draw : undefined}
                  onTouchEnd={enableDrawing ? stopDrawing : undefined}
                />

                {/* 드로잉 상태 표시 */}
                {enableDrawing && (
                  <div className="absolute top-2 right-2 z-20">
                    <Badge
                      variant={
                        drawingStatus === 'completed' ? "default" :
                        drawingStatus === 'writing' ? "default" :
                        drawingStatus === 'erasing' ? "destructive" :
                        drawingStatus === 'paused' ? "secondary" :
                        "outline"
                      }
                      className="text-xs"
                    >
                      {drawingStatus === 'idle' && "터치하여 필기"}
                      {drawingStatus === 'writing' && "필기 중"}
                      {drawingStatus === 'erasing' && "지우개 사용 중"}
                      {drawingStatus === 'paused' && "필기 일시 정지"}
                      {drawingStatus === 'completed' && "필기 완료"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 문제 상세 정보 (메타데이터 표시 시) */}
          {showMetadata && problem.metadata && (
            <div className="pt-4 border-t">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                  상세 정보
                </summary>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <div className="flex gap-4">
                    <span>난이도: {problem.metadata.level_of_difficulty || '정보 없음'}</span>
                    <span>문제유형: {problem.metadata.types_of_problems || '정보 없음'}</span>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}