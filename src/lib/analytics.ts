import { ActivitySegment, ProblemSolvingAnalytics } from '@/types'

/**
 * 문제 풀이 활동 세그먼트로부터 통계를 계산합니다.
 *
 * @param segments 활동 세그먼트 배열
 * @param firstReactionTime 문제 로드 후 첫 필기까지 시간 (초)
 * @returns 6가지 핵심 지표를 포함한 분석 결과
 */
export function calculateProblemSolvingAnalytics(
  segments: ActivitySegment[],
  firstReactionTime?: number
): ProblemSolvingAnalytics {
  // 4. 최초 반응 (문제 로드 ~ 첫 필기 시작)
  // 첫 번째 세그먼트가 paused이면 그것이 최초 반응 시간
  const firstReaction = segments.length > 0 && segments[0]?.type === 'paused'
    ? (segments[0].duration || 0)
    : (firstReactionTime || 0)

  // 1. 필기 시간 (writing 세그먼트 합계)
  const writingTime = segments
    .filter(s => s.type === 'writing')
    .reduce((sum, s) => sum + (s.duration || 0), 0)

  // 2. 고민 시간 (paused 세그먼트 합계, 첫 번째 제외)
  const thinkingTime = segments
    .filter((s, index) => s.type === 'paused' && index !== 0)
    .reduce((sum, s) => sum + (s.duration || 0), 0)

  // 3. 지우기 시간 (erasing 세그먼트 합계)
  const erasingTime = segments
    .filter(s => s.type === 'erasing')
    .reduce((sum, s) => sum + (s.duration || 0), 0)

  // 5. 최대 정지 (가장 긴 paused 세그먼트, 첫 번째 제외)
  const pausedSegments = segments.filter((s, index) => s.type === 'paused' && index !== 0)
  const maxPauseTime = pausedSegments.length > 0
    ? Math.max(...pausedSegments.map(s => s.duration || 0))
    : 0

  // 6. 재풀이 횟수 (3초 이상 지우기 세그먼트)
  const reworkCount = segments.filter(
    s => s.type === 'erasing' && s.metadata?.isRework === true
  ).length

  // 총 활동 시간
  const totalTime = writingTime + thinkingTime + erasingTime + firstReaction

  return {
    writingTime,
    thinkingTime,
    erasingTime,
    firstReactionTime: firstReaction,
    maxPauseTime,
    reworkCount,
    totalTime
  }
}

/**
 * 초를 "분:초" 형식으로 포맷합니다.
 *
 * @param seconds 초 단위 시간
 * @returns "분:초" 형식 문자열 (예: "2:35")
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 초를 "X분 Y초" 형식으로 포맷합니다.
 *
 * @param seconds 초 단위 시간
 * @returns "X분 Y초" 형식 문자열
 */
export function formatTimeVerbose(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (mins === 0) {
    return `${secs}초`
  }

  if (secs === 0) {
    return `${mins}분`
  }

  return `${mins}분 ${secs}초`
}

/**
 * 백분율을 계산하여 포맷합니다.
 *
 * @param part 부분 값
 * @param total 전체 값
 * @returns 백분율 문자열 (예: "35%")
 */
export function formatPercentage(part: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

/**
 * 활동 세그먼트 타입을 한글 라벨로 변환합니다.
 *
 * @param type 세그먼트 타입
 * @returns 한글 라벨
 */
export function getActivityLabel(type: ActivitySegment['type']): string {
  switch (type) {
    case 'writing':
      return '필기'
    case 'erasing':
      return '지우기'
    case 'paused':
      return '고민'
    default:
      return type
  }
}

/**
 * 활동 세그먼트 타입에 따른 색상 클래스를 반환합니다.
 *
 * @param type 세그먼트 타입
 * @returns Tailwind CSS 색상 클래스
 */
export function getActivityColor(type: ActivitySegment['type']): string {
  switch (type) {
    case 'writing':
      return 'bg-blue-500'
    case 'erasing':
      return 'bg-orange-500'
    case 'paused':
      return 'bg-yellow-500'
    default:
      return 'bg-gray-400'
  }
}

/**
 * 활동 세그먼트 타입에 따른 텍스트 색상 클래스를 반환합니다.
 *
 * @param type 세그먼트 타입
 * @returns Tailwind CSS 텍스트 색상 클래스
 */
export function getActivityTextColor(type: ActivitySegment['type']): string {
  switch (type) {
    case 'writing':
      return 'text-blue-600'
    case 'erasing':
      return 'text-orange-600'
    case 'paused':
      return 'text-yellow-600'
    default:
      return 'text-gray-600'
  }
}
