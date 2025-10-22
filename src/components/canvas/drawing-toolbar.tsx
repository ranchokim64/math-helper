"use client"

import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Pencil,
  Eraser,
  Undo2,
  Redo2,
  Trash2
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

export type DrawingTool = 'pen' | 'eraser'

interface DrawingToolbarProps {
  currentTool: DrawingTool
  onToolChange: (tool: DrawingTool) => void
  lineWidth: number
  onLineWidthChange: (width: number) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  canUndo: boolean
  canRedo: boolean
  disabled?: boolean
}

export function DrawingToolbar({
  currentTool,
  onToolChange,
  lineWidth,
  onLineWidthChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  disabled = false
}: DrawingToolbarProps) {
  return (
    <div className="flex items-center space-x-2 p-2 bg-white border rounded-lg shadow-sm">
      {/* 도구 선택 */}
      <ToggleGroup
        type="single"
        value={currentTool}
        onValueChange={(value) => {
          if (value) onToolChange(value as DrawingTool)
        }}
        disabled={disabled}
      >
        <ToggleGroupItem value="pen" aria-label="펜">
          <Pencil className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="eraser" aria-label="지우개">
          <Eraser className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" className="h-6" />

      {/* 선 굵기 */}
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-500 mr-1">굵기:</span>
        <ToggleGroup
          type="single"
          value={lineWidth.toString()}
          onValueChange={(value) => {
            if (value) onLineWidthChange(Number(value))
          }}
          disabled={disabled}
        >
          <ToggleGroupItem value="1" aria-label="가는 선" className="px-2 text-xs">
            가늘게
          </ToggleGroupItem>
          <ToggleGroupItem value="2" aria-label="보통 선" className="px-2 text-xs">
            보통
          </ToggleGroupItem>
          <ToggleGroupItem value="4" aria-label="굵은 선" className="px-2 text-xs">
            굵게
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 실행 취소/다시 실행 */}
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={disabled || !canUndo}
          aria-label="실행 취소"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={disabled || !canRedo}
          aria-label="다시 실행"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 전체 지우기 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={disabled}
        aria-label="전체 지우기"
        className="text-red-500 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
