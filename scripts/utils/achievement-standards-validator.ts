/**
 * 성취기준 데이터 검증 및 정제 유틸리티
 */

// 성취기준 코드 패턴 (예: [4수01-05])
const ACHIEVEMENT_CODE_PATTERN = /\[(\d)수(\d{2})-(\d{2})\]/g

/**
 * 성취기준 배열에서 공백과 불필요한 요소들을 제거하고 정제
 * @param achievementStandards 원본 성취기준 배열
 * @returns 정제된 성취기준 배열
 */
export function cleanAchievementStandards(achievementStandards: unknown): string[] {
  if (!Array.isArray(achievementStandards)) {
    console.warn('성취기준이 배열이 아닙니다:', typeof achievementStandards)
    return []
  }

  const cleaned = achievementStandards
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => {
      // 공백이나 빈 문자열 제거
      if (item === '' || item === ' ' || item === '  ') {
        return false
      }

      // 성취기준 패턴이 있는 항목만 유지
      const hasAchievementCode = ACHIEVEMENT_CODE_PATTERN.test(item)
      ACHIEVEMENT_CODE_PATTERN.lastIndex = 0 // 정규식 상태 초기화
      return hasAchievementCode
    })
    .map(item => {
      // 성취기준 코드만 추출 (설명 제거)
      const match = item.match(/(\[(\d)수(\d{2})-(\d{2})\])/)
      return match ? match[1] : item
    })

  return [...new Set(cleaned)] // 중복 제거
}

/**
 * 성취기준 코드의 유효성 검증
 * @param achievementCode 성취기준 코드 (예: "[4수01-05]")
 * @returns 유효성 여부
 */
export function validateAchievementCode(achievementCode: string): boolean {
  const pattern = /^\[(\d)수(\d{2})-(\d{2})\]$/
  const match = achievementCode.match(pattern)

  if (!match) {
    return false
  }

  const [, gradeCode, areaCode, sequenceCode] = match

  // 학년 코드 검증 (2, 4, 6만 유효)
  if (!['2', '4', '6'].includes(gradeCode)) {
    return false
  }

  // 영역 코드 검증 (01~05)
  const areaNum = parseInt(areaCode)
  if (areaNum < 1 || areaNum > 5) {
    return false
  }

  // 순서 코드 검증 (01~99)
  const sequenceNum = parseInt(sequenceCode)
  if (sequenceNum < 1 || sequenceNum > 99) {
    return false
  }

  return true
}

/**
 * 성취기준 배열의 전체 유효성 검증
 * @param achievementStandards 성취기준 배열
 * @returns 검증 결과
 */
export function validateAchievementStandards(achievementStandards: string[]): {
  isValid: boolean
  validCodes: string[]
  invalidCodes: string[]
  warnings: string[]
} {
  const validCodes: string[] = []
  const invalidCodes: string[] = []
  const warnings: string[] = []

  if (!Array.isArray(achievementStandards)) {
    return {
      isValid: false,
      validCodes: [],
      invalidCodes: [],
      warnings: ['성취기준이 배열이 아닙니다']
    }
  }

  if (achievementStandards.length === 0) {
    warnings.push('성취기준이 비어있습니다')
  }

  for (const code of achievementStandards) {
    if (validateAchievementCode(code)) {
      validCodes.push(code)
    } else {
      invalidCodes.push(code)
    }
  }

  // 중복 검사
  const uniqueCodes = new Set(validCodes)
  if (uniqueCodes.size !== validCodes.length) {
    warnings.push('중복된 성취기준이 있습니다')
  }

  return {
    isValid: invalidCodes.length === 0,
    validCodes: [...uniqueCodes],
    invalidCodes,
    warnings
  }
}

/**
 * 문제 데이터 임포트 시 성취기준 전처리
 * @param rawAchievementStandards 원본 성취기준 데이터
 * @returns 정제되고 검증된 성취기준 배열
 */
export function preprocessAchievementStandards(rawAchievementStandards: unknown): {
  cleanedStandards: string[]
  validation: ReturnType<typeof validateAchievementStandards>
  shouldSkip: boolean
} {
  // 1단계: 데이터 정제
  const cleanedStandards = cleanAchievementStandards(rawAchievementStandards)

  // 2단계: 유효성 검증
  const validation = validateAchievementStandards(cleanedStandards)

  // 3단계: 처리 결정
  const shouldSkip = validation.validCodes.length === 0

  return {
    cleanedStandards: validation.validCodes,
    validation,
    shouldSkip
  }
}

/**
 * 성취기준 로깅 유틸리티
 */
export function logAchievementProcessing(
  sourceId: string,
  result: ReturnType<typeof preprocessAchievementStandards>
): void {
  const { cleanedStandards, validation, shouldSkip } = result

  if (shouldSkip) {
    console.warn(`⚠️  ${sourceId}: 유효한 성취기준이 없어 스킵됩니다`)
    return
  }

  if (validation.invalidCodes.length > 0) {
    console.warn(
      `⚠️  ${sourceId}: 유효하지 않은 성취기준 발견 - ${validation.invalidCodes.join(', ')}`
    )
  }

  if (validation.warnings.length > 0) {
    console.warn(`⚠️  ${sourceId}: ${validation.warnings.join(', ')}`)
  }

  console.log(`✓ ${sourceId}: ${cleanedStandards.join(', ')}`)
}