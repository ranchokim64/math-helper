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
  disabled?: boolean
  isAnswering?: boolean
  onRecordingPause?: () => void
  onRecordingResume?: () => void
  onSegmentChange?: (type: 'drawing' | 'paused' | 'answering') => void
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

interface MathContent {
  type: "text" | "inline-math" | "block-math"
  content: string
}

type DrawingStatus = 'idle' | 'drawing' | 'paused' | 'completed'

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
  disabled = false,
  isAnswering = false,
  onRecordingPause,
  onRecordingResume,
  onSegmentChange,
  onCanvasReady
}: ProblemViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)
  const [katexLoaded, setKatexLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)

  // 캔버스 관련 상태
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingStatus, setDrawingStatus] = useState<DrawingStatus>('idle')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const loadedImageRef = useRef<HTMLImageElement | null>(null)
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentStrokeRef = useRef<Stroke | null>(null) // 실시간 그리기용 ref

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

  // 캔버스 크기 조정
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = imageContainerRef.current
    if (canvas && container && enableDrawing) {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
    }
  }, [enableDrawing])

  // 10초 타이머 초기화
  const resetPauseTimer = () => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }
  }

  // 10초 타이머 시작
  const startPauseTimer = () => {
    resetPauseTimer()
    pauseTimerRef.current = setTimeout(() => {
      setDrawingStatus('paused')
    }, 10000) // 10초
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

  // 캔버스 다시 그리기 (통합 렌더링: 이미지 + 마스킹 + 드로잉)
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 1. 배경 이미지 그리기
    const img = loadedImageRef.current
    if (img && img.complete && imageDimensions) {
      // 이미지를 Canvas 크기에 맞춰 그리기
      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
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

          // 마스크 사각형 그리기
          ctx.fillStyle = 'rgba(200, 200, 200, 0.9)'
          ctx.fillRect(maskX, maskY, maskWidth, maskHeight)

          // 테두리
          ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)'
          ctx.lineWidth = 2
          ctx.strokeRect(maskX, maskY, maskWidth, maskHeight)

          // 라벨 텍스트
          ctx.fillStyle = '#666'
          ctx.font = 'bold 14px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(
            section.type === 'answer' ? '정답' : '해설',
            maskX + maskWidth / 2,
            maskY + maskHeight / 2
          )
        })
      }
    }

    // 3. 히스토리 스텝까지의 모든 스트로크 다시 그리기
    for (let i = 0; i < historyStep; i++) {
      drawStroke(ctx, strokes[i]!)
    }

    // 4. 현재 그리고 있는 스트로크도 그리기 (ref 사용)
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      drawStroke(ctx, currentStrokeRef.current)
    }
  }, [showAnswerKey, problem.sections, imageDimensions, strokes, historyStep])

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
    setDrawingStatus('drawing')
    resetPauseTimer()

    // 첫 번째 드로잉 시
    if (drawingStatus === 'idle' && onFirstDraw) {
      onFirstDraw()
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

      // 즉시 Canvas 재렌더링 (깜빡임 방지)
      // 새로운 스트로크를 포함하여 즉시 그리기
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        // Canvas 클리어
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // 배경 이미지 + 마스킹 그리기
        const img = loadedImageRef.current
        if (img && img.complete && imageDimensions) {
          const canvasWidth = canvas.width
          const canvasHeight = canvas.height
          const imgWidth = imageDimensions.width
          const imgHeight = imageDimensions.height

          const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight)
          const scaledWidth = imgWidth * scale
          const scaledHeight = imgHeight * scale
          const x = (canvasWidth - scaledWidth) / 2
          const y = (canvasHeight - scaledHeight) / 2

          ctx.drawImage(img, x, y, scaledWidth, scaledHeight)

          // 마스킹 레이어 (필요 시)
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

              const maskX = x + (x1 * scale)
              const maskY = y + (y1 * scale)
              const maskWidth = width * scale
              const maskHeight = height * scale

              ctx.fillStyle = 'rgba(200, 200, 200, 0.9)'
              ctx.fillRect(maskX, maskY, maskWidth, maskHeight)

              ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)'
              ctx.lineWidth = 2
              ctx.strokeRect(maskX, maskY, maskWidth, maskHeight)

              ctx.fillStyle = '#666'
              ctx.font = 'bold 14px sans-serif'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(
                section.type === 'answer' ? '정답' : '해설',
                maskX + maskWidth / 2,
                maskY + maskHeight / 2
              )
            })
          }
        }

        // 모든 스트로크 그리기 (새로운 스트로크 포함)
        for (let i = 0; i < newStrokes.length; i++) {
          drawStroke(ctx, newStrokes[i]!)
        }
      }

      // 10초 타이머 시작
      startPauseTimer()
    }
  }, [isDrawing, currentStroke, strokes, historyStep, showAnswerKey, problem.sections, imageDimensions])

  // isAnswering 변경 시 상태 업데이트
  useEffect(() => {
    if (isAnswering && drawingStatus !== 'idle') {
      setDrawingStatus('completed')
      resetPauseTimer()
      // answering 세그먼트 시작
      if (onSegmentChange) {
        onSegmentChange('answering')
      }
    }
  }, [isAnswering, drawingStatus, onSegmentChange])

  // drawingStatus 변경 시 녹화 제어
  useEffect(() => {
    if (!enableDrawing) return

    switch (drawingStatus) {
      case 'drawing':
        // 필기 중 - 녹화 재개
        if (onRecordingResume) {
          onRecordingResume()
        }
        if (onSegmentChange) {
          onSegmentChange('drawing')
        }
        break

      case 'paused':
        // 일시 정지 - 녹화 일시정지
        if (onRecordingPause) {
          onRecordingPause()
        }
        if (onSegmentChange) {
          onSegmentChange('paused')
        }
        break

      case 'completed':
        // 완료 - 녹화 일시정지 (답안 입력 중)
        if (onRecordingPause) {
          onRecordingPause()
        }
        break
    }
  }, [drawingStatus, enableDrawing, onRecordingPause, onRecordingResume, onSegmentChange])

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
    // KaTeX CSS 동적 로드
    const loadKatexCSS = async () => {
      try {
        // CSS 파일을 문서에 직접 추가
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css'
        document.head.appendChild(link)
        setKatexLoaded(true)
      } catch (error) {
        console.warn("KaTeX CSS 로드 실패:", error)
        setKatexLoaded(true) // 오류가 있어도 계속 진행
      }
    }
    loadKatexCSS()
  }, [])

  // 이미지 로드 및 Canvas 초기 렌더링
  useEffect(() => {
    if (!problem.imageUrl) return

    // 이미지 로딩 시작 시 Canvas 숨김 (이전 문제의 정답 노출 방지)
    setImageLoaded(false)

    const img = document.createElement('img') as HTMLImageElement
    img.crossOrigin = 'anonymous' // CORS 허용
    img.src = encodeImageUrl(problem.imageUrl)

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

          // Canvas가 준비되면 콜백 호출
          if (onCanvasReady && canvasRef.current) {
            onCanvasReady(canvasRef.current)
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
                    ? 'h-[700px]' // 드로잉 모드: 고정 높이로 큰 이미지
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

                {/* Canvas - 이미지, 마스킹, 드로잉 모두 처리 */}
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  } transition-opacity duration-200 ${
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
                        drawingStatus === 'drawing' ? "default" :
                        drawingStatus === 'paused' ? "secondary" :
                        "outline"
                      }
                      className="text-xs"
                    >
                      {drawingStatus === 'idle' && "터치하여 필기"}
                      {drawingStatus === 'drawing' && "필기 중"}
                      {drawingStatus === 'paused' && "필기 일시 정지"}
                      {drawingStatus === 'completed' && "필기 완료"}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 문제 섹션들 렌더링 (텍스트 내용) */}
          {problem.sections
            ?.sort((a, b) => a.position - b.position)
            .filter((section) => {
              // showAnswerKey가 false인 경우 정답 관련 섹션 필터링
              if (!showAnswerKey) {
                // 'explanation' 섹션은 정답 해설로 간주하여 학생에게 숨김
                if (section.type === 'explanation') {
                  return false
                }
                // 'answer' 섹션도 학생에게 숨김
                if (section.type === 'answer') {
                  return false
                }
                // 내용에 정답 관련 키워드가 있는 텍스트 섹션도 필터링
                if (section.type === 'text' &&
                    (section.content.includes('정답') ||
                     section.content.includes('해답') ||
                     section.content.includes('답:') ||
                     section.content.includes('해설'))) {
                  return false
                }
              }
              return true
            })
            .map((section, index) => (
              <div key={index} className="space-y-3">
                {section.type === 'question' && (
                  <div className="text-lg font-medium leading-relaxed">
                    {renderTextContent(section.content)}
                  </div>
                )}

                {section.type === 'choices' && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-2">선택지</div>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {renderTextContent(section.content)}
                    </div>
                  </div>
                )}

                {section.type === 'question_image' && (
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="text-sm font-medium text-amber-800 mb-2">수식 내용</div>
                    <div className="text-gray-700 leading-relaxed">
                      {renderTextContent(section.content)}
                    </div>
                  </div>
                )}

                {section.type === 'text' && (
                  <div className="text-gray-700 leading-relaxed">
                    {renderTextContent(section.content)}
                  </div>
                )}
              </div>
            ))}

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