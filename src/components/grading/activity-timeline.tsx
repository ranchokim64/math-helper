"use client"

import { ActivitySegment } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Clock, Eraser, Zap, PauseCircle, RotateCcw } from "lucide-react"
import {
  calculateProblemSolvingAnalytics,
  formatTimeVerbose,
  formatPercentage,
  getActivityColor,
  getActivityLabel
} from "@/lib/analytics"

interface ActivityTimelineProps {
  segments: ActivitySegment[]
  totalDuration: number
  firstReactionTime?: number
}

export function ActivityTimeline({ segments, totalDuration, firstReactionTime }: ActivityTimelineProps) {
  // 6가지 핵심 지표 계산
  const analytics = calculateProblemSolvingAnalytics(segments, firstReactionTime)

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
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
        {/* 6가지 핵심 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* 1. 필기 시간 */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Pencil className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">필기 시간</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatTimeVerbose(analytics.writingTime)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {formatPercentage(analytics.writingTime, analytics.totalTime)}
            </div>
          </div>

          {/* 2. 고민 시간 */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">고민 시간</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {formatTimeVerbose(analytics.thinkingTime)}
            </div>
            <div className="text-xs text-yellow-600 mt-1">
              {formatPercentage(analytics.thinkingTime, analytics.totalTime)}
            </div>
          </div>

          {/* 3. 지우기 */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center space-x-2 mb-2">
              <Eraser className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">지우기</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {formatTimeVerbose(analytics.erasingTime)}
            </div>
            <div className="text-xs text-orange-600 mt-1">
              {formatPercentage(analytics.erasingTime, analytics.totalTime)}
            </div>
          </div>

          {/* 4. 최초 반응 */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">최초 반응</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {formatTimeVerbose(analytics.firstReactionTime)}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              문제 이해 속도
            </div>
          </div>

          {/* 5. 최대 정지 */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2 mb-2">
              <PauseCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">최대 정지</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatTimeVerbose(analytics.maxPauseTime)}
            </div>
            <div className="text-xs text-red-600 mt-1">
              가장 긴 고민
            </div>
          </div>

          {/* 6. 재풀이 */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="flex items-center space-x-2 mb-2">
              <RotateCcw className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900">재풀이</span>
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              {analytics.reworkCount}회
            </div>
            <div className="text-xs text-indigo-600 mt-1">
              전략 변경
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

              // 첫 번째 paused 세그먼트는 "최초 반응"으로 표시
              const isFirstReaction = index === 0 && segment.type === 'paused'
              const displayType = isFirstReaction ? '최초 반응' : getActivityLabel(segment.type)
              const colorClass = isFirstReaction ? 'bg-purple-400' : getActivityColor(segment.type)

              // 세그먼트의 상대적 위치와 너비 계산 (녹화 시작 시간 기준)
              const offsetFromStart = (segment.startTime - timelineStart) / 1000 // 초 단위
              const leftPercent = totalDuration > 0 ? (offsetFromStart / totalDuration) * 100 : 0
              const widthPercent = totalDuration > 0 ? (segment.duration / totalDuration) * 100 : 0

              return (
                <div
                  key={index}
                  className={`absolute h-full ${colorClass} hover:opacity-80 transition-opacity cursor-pointer group`}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`
                  }}
                  title={`${displayType}: ${formatTime(segment.duration)}`}
                >
                  {/* 툴팁 */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {displayType}: {formatTime(segment.duration)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 범례 */}
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
            {segments.length > 0 && segments[0]?.type === 'paused' && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-400 rounded"></div>
                <span>최초 반응</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>필기</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>지우기</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>고민</span>
            </div>
          </div>
        </div>

        {/* 세그먼트 상세 목록 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">활동 상세</div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {segments.map((segment, index) => {
              if (!segment.endTime || !segment.duration) return null

              // 첫 번째 paused 세그먼트는 "최초 반응"으로 표시
              const isFirstReaction = index === 0 && segment.type === 'paused'
              const displayType = isFirstReaction ? '최초 반응' : getActivityLabel(segment.type)
              const colorClass = isFirstReaction ? 'bg-purple-400' : getActivityColor(segment.type)

              const offsetFromStart = (segment.startTime - timelineStart) / 1000

              return (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-2 bg-gray-50 rounded text-sm"
                >
                  <div className={`w-3 h-3 ${colorClass} rounded-full flex-shrink-0`}></div>
                  <div className="flex-1">
                    <span className="font-medium">{displayType}</span>
                    {segment.metadata?.isRework && (
                      <span className="ml-2 text-xs text-indigo-600 font-semibold">(재풀이)</span>
                    )}
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
