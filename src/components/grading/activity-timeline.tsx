"use client"

import { ActivitySegment } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Clock, Edit3 } from "lucide-react"

interface ActivityTimelineProps {
  segments: ActivitySegment[]
  totalDuration: number
}

export function ActivityTimeline({ segments, totalDuration }: ActivityTimelineProps) {
  // 각 세그먼트 타입별 총 시간 계산
  const drawingTime = segments
    .filter(s => s.type === 'drawing')
    .reduce((sum, s) => sum + (s.duration || 0), 0)

  const pausedTime = segments
    .filter(s => s.type === 'paused')
    .reduce((sum, s) => sum + (s.duration || 0), 0)

  const answeringTime = segments
    .filter(s => s.type === 'answering')
    .reduce((sum, s) => sum + (s.duration || 0), 0)

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // 세그먼트 색상
  const getSegmentColor = (type: string) => {
    switch (type) {
      case 'drawing':
        return 'bg-blue-500'
      case 'paused':
        return 'bg-yellow-500'
      case 'answering':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  // 세그먼트 라벨
  const getSegmentLabel = (type: string) => {
    switch (type) {
      case 'drawing':
        return '필기'
      case 'paused':
        return '고민'
      case 'answering':
        return '답안'
      default:
        return '기타'
    }
  }

  // 타임라인 시작 시간 (첫 세그먼트 시작 시간)
  const timelineStart = segments.length > 0 ? segments[0]!.startTime : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>학습 활동 타임라인</span>
        </CardTitle>
        <CardDescription>
          학생의 문제 풀이 과정을 시간대별로 확인할 수 있습니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 통계 요약 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Pencil className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">필기 시간</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.floor(drawingTime / 60)}분 {drawingTime % 60}초
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {totalDuration > 0 ? Math.round((drawingTime / totalDuration) * 100) : 0}%
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">고민 시간</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {Math.floor(pausedTime / 60)}분 {pausedTime % 60}초
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              {totalDuration > 0 ? Math.round((pausedTime / totalDuration) * 100) : 0}%
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <Edit3 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">답안 작성</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {Math.floor(answeringTime / 60)}분 {answeringTime % 60}초
            </div>
            <div className="text-xs text-green-600 mt-1">
              {totalDuration > 0 ? Math.round((answeringTime / totalDuration) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* 타임라인 시각화 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>타임라인</span>
            <span>총 {Math.floor(totalDuration / 60)}분 {totalDuration % 60}초</span>
          </div>

          {/* 타임라인 바 */}
          <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
            {segments.map((segment, index) => {
              if (!segment.endTime || !segment.duration) return null

              // 세그먼트의 상대적 위치와 너비 계산
              const offsetFromStart = (segment.startTime - timelineStart) / 1000 // 초 단위
              const leftPercent = totalDuration > 0 ? (offsetFromStart / totalDuration) * 100 : 0
              const widthPercent = totalDuration > 0 ? (segment.duration / totalDuration) * 100 : 0

              return (
                <div
                  key={index}
                  className={`absolute h-full ${getSegmentColor(segment.type)} hover:opacity-80 transition-opacity cursor-pointer group`}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`
                  }}
                  title={`${getSegmentLabel(segment.type)}: ${formatTime(segment.duration)}`}
                >
                  {/* 툴팁 */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {getSegmentLabel(segment.type)}: {formatTime(segment.duration)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 범례 */}
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>필기</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>고민</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>답안 작성</span>
            </div>
          </div>
        </div>

        {/* 세그먼트 상세 목록 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">활동 상세</div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {segments.map((segment, index) => {
              if (!segment.endTime || !segment.duration) return null

              const offsetFromStart = (segment.startTime - timelineStart) / 1000

              return (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-2 bg-gray-50 rounded text-sm"
                >
                  <div className={`w-3 h-3 ${getSegmentColor(segment.type)} rounded-full flex-shrink-0`}></div>
                  <div className="flex-1">
                    <span className="font-medium">{getSegmentLabel(segment.type)}</span>
                  </div>
                  <div className="text-gray-600">
                    {formatTime(Math.floor(offsetFromStart))} ~ {formatTime(Math.floor(offsetFromStart + segment.duration))}
                  </div>
                  <div className="font-medium text-gray-900">
                    {formatTime(segment.duration)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
