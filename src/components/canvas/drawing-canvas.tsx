"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Pen,
  Eraser,
  Undo,
  Redo,
  RotateCcw,
  Palette,
  Minus,
  Plus
} from "lucide-react"

interface DrawingCanvasProps {
  width?: number
  height?: number
  className?: string
  onDrawingChange?: (hasDrawing: boolean) => void
  onFirstDraw?: () => void // 첫 번째 그리기 시 호출
  disabled?: boolean
}

interface DrawingState {
  paths: Path[]
  currentPath: Point[]
  redoStack: Path[]
}

interface Point {
  x: number
  y: number
  pressure?: number
}

interface Path {
  points: Point[]
  color: string
  width: number
  tool: 'pen' | 'eraser'
}

const COLORS = [
  '#000000', // 검정
  '#FF0000', // 빨강
  '#0000FF', // 파랑
  '#008000', // 초록
  '#800080', // 보라
  '#FFA500', // 주황
]

const PEN_WIDTHS = [2, 4, 6, 8]
const ERASER_WIDTHS = [10, 15, 20, 25]

export function DrawingCanvas({
  width = 800,
  height = 600,
  className = "",
  onDrawingChange,
  onFirstDraw,
  disabled = false
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [color, setColor] = useState('#000000')
  const [penWidth, setPenWidth] = useState(4)
  const [eraserWidth, setEraserWidth] = useState(15)

  const [drawingState, setDrawingState] = useState<DrawingState>({
    paths: [],
    currentPath: [],
    redoStack: []
  })

  const [hasStartedDrawing, setHasStartedDrawing] = useState(false)

  // Canvas 초기화
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 캔버스 크기 설정
    canvas.width = width
    canvas.height = height

    // 기본 설정
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.imageSmoothingEnabled = true

    // 배경 흰색으로 초기화
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }, [width, height])

  // 캔버스 다시 그리기
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 캔버스 클리어
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // 모든 경로 다시 그리기
    drawingState.paths.forEach(path => {
      if (path.points.length < 2) return

      ctx.strokeStyle = path.color
      ctx.lineWidth = path.width
      ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over'

      ctx.beginPath()
      ctx.moveTo(path.points[0]!.x, path.points[0]!.y)

      for (let i = 1; i < path.points.length; i++) {
        const point = path.points[i]!
        ctx.lineTo(point.x, point.y)
      }

      ctx.stroke()
    })

    // 현재 그리고 있는 경로
    if (drawingState.currentPath.length > 1) {
      ctx.strokeStyle = tool === 'eraser' ? '#000000' : color
      ctx.lineWidth = tool === 'pen' ? penWidth : eraserWidth
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'

      ctx.beginPath()
      ctx.moveTo(drawingState.currentPath[0]!.x, drawingState.currentPath[0]!.y)

      for (let i = 1; i < drawingState.currentPath.length; i++) {
        const point = drawingState.currentPath[i]!
        ctx.lineTo(point.x, point.y)
      }

      ctx.stroke()
    }
  }, [drawingState, tool, color, penWidth, eraserWidth, width, height])

  // 캔버스 다시 그리기 (상태 변경 시)
  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  // 마우스/터치 좌표 계산
  const getEventPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return {
        x: (touch!.clientX - rect.left) * scaleX,
        y: (touch!.clientY - rect.top) * scaleY
      }
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      }
    }
  }

  // 그리기 시작
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return

    e.preventDefault()
    setIsDrawing(true)

    // 첫 번째 그리기인지 확인
    if (!hasStartedDrawing) {
      setHasStartedDrawing(true)
      onFirstDraw?.() // 첫 번째 그리기 시 콜백 호출
    }

    const point = getEventPos(e)
    setDrawingState(prev => ({
      ...prev,
      currentPath: [point],
      redoStack: [] // 새로운 그리기 시작 시 redo 스택 클리어
    }))
  }

  // 그리기 중
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return

    e.preventDefault()
    const point = getEventPos(e)

    setDrawingState(prev => ({
      ...prev,
      currentPath: [...prev.currentPath, point]
    }))
  }

  // 그리기 종료
  const stopDrawing = () => {
    if (!isDrawing) return

    setIsDrawing(false)

    setDrawingState(prev => {
      const newPath: Path = {
        points: prev.currentPath,
        color: tool === 'eraser' ? '#000000' : color,
        width: tool === 'pen' ? penWidth : eraserWidth,
        tool
      }

      const newPaths = [...prev.paths, newPath]

      // 그리기 변경 알림
      if (onDrawingChange) {
        onDrawingChange(newPaths.length > 0)
      }

      return {
        paths: newPaths,
        currentPath: [],
        redoStack: prev.redoStack
      }
    })
  }

  // 실행 취소
  const undo = () => {
    setDrawingState(prev => {
      if (prev.paths.length === 0) return prev

      const lastPath = prev.paths[prev.paths.length - 1]!
      const newPaths = prev.paths.slice(0, -1)

      if (onDrawingChange) {
        onDrawingChange(newPaths.length > 0)
      }

      return {
        paths: newPaths,
        currentPath: [],
        redoStack: [...prev.redoStack, lastPath]
      }
    })
  }

  // 다시 실행
  const redo = () => {
    setDrawingState(prev => {
      if (prev.redoStack.length === 0) return prev

      const pathToRedo = prev.redoStack[prev.redoStack.length - 1]!
      const newPaths = [...prev.paths, pathToRedo]

      if (onDrawingChange) {
        onDrawingChange(newPaths.length > 0)
      }

      return {
        paths: newPaths,
        currentPath: [],
        redoStack: prev.redoStack.slice(0, -1)
      }
    })
  }

  // 전체 지우기
  const clearCanvas = () => {
    setDrawingState({
      paths: [],
      currentPath: [],
      redoStack: []
    })

    setHasStartedDrawing(false) // 첫 그리기 상태 리셋

    if (onDrawingChange) {
      onDrawingChange(false)
    }
  }

  // 펜 두께 변경
  const changePenWidth = (delta: number) => {
    if (tool === 'pen') {
      setPenWidth(prev => Math.max(1, Math.min(10, prev + delta)))
    } else {
      setEraserWidth(prev => Math.max(5, Math.min(30, prev + delta)))
    }
  }

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {/* 도구 패널 */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* 도구 선택 */}
          <div className="flex items-center space-x-2">
            <Button
              variant={tool === 'pen' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('pen')}
              disabled={disabled}
            >
              <Pen className="h-4 w-4 mr-1" />
              펜
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('eraser')}
              disabled={disabled}
            >
              <Eraser className="h-4 w-4 mr-1" />
              지우개
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* 색상 선택 (펜 모드에서만) */}
          {tool === 'pen' && (
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <div className="flex space-x-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-6 h-6 rounded border-2 cursor-pointer disabled:cursor-not-allowed ${
                      color === c ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          )}

          <Separator orientation="vertical" className="h-6" />

          {/* 두께 조절 */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePenWidth(-1)}
              disabled={disabled}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm min-w-[3rem] text-center">
              {tool === 'pen' ? penWidth : eraserWidth}px
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePenWidth(1)}
              disabled={disabled}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* 실행 취소/다시 실행 */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={disabled || drawingState.paths.length === 0}
            >
              <Undo className="h-4 w-4 mr-1" />
              취소
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={disabled || drawingState.redoStack.length === 0}
            >
              <Redo className="h-4 w-4 mr-1" />
              다시 실행
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* 전체 지우기 */}
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            disabled={disabled || drawingState.paths.length === 0}
            className="text-red-600 hover:text-red-700"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            전체 지우기
          </Button>
        </div>
      </Card>

      {/* 캔버스 */}
      <Card className="p-4 relative">
        <canvas
          ref={canvasRef}
          className="border border-gray-200 rounded cursor-crosshair touch-none"
          style={{
            width: '100%',
            maxWidth: `${width}px`,
            height: 'auto',
            aspectRatio: `${width}/${height}`
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* 첫 번째 필기 안내 */}
        {!hasStartedDrawing && drawingState.paths.length === 0 && (
          <div className="absolute inset-4 flex items-center justify-center pointer-events-none">
            <div className="bg-blue-50 border-2 border-blue-200 border-dashed rounded-lg p-6 text-center max-w-md">
              <div className="text-blue-600 text-sm font-medium mb-2">
                ✏️ 첫 번째 필기를 시작하세요
              </div>
              <div className="text-blue-500 text-xs">
                펜을 터치하는 순간 화면 녹화가 자동으로 시작됩니다
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}