// 성취기준 코드를 영역명과 내용요소로 매핑하는 시스템
// 2015 개정 교육과정과 2022 개정 교육과정의 영역을 통합

import achievementStandardsData from './achievement-standards-master.json'

interface AreaMapping {
  area: string
  grade: string
  curriculum: '2015' | '2022'
}

interface ContentElementMapping {
  contentElement: string
  area: string
  grade: string
  curriculum: '2015' | '2022'
}

// 2022 교육과정 기준 4개 영역 (통합 기준)
export const MATH_AREAS = {
  NUMBER_OPERATION: '수와 연산',
  CHANGE_RELATIONSHIP: '변화와 관계',
  GEOMETRY_MEASUREMENT: '도형과 측정',
  DATA_POSSIBILITY: '자료와 가능성'
} as const

// 2015 교육과정 영역 번호 → 2022 통합 영역 매핑
const CURRICULUM_2015_AREA_MAPPING: Record<string, string> = {
  '01': MATH_AREAS.NUMBER_OPERATION,     // 수와 연산
  '02': MATH_AREAS.GEOMETRY_MEASUREMENT, // 도형 → 도형과 측정
  '03': MATH_AREAS.GEOMETRY_MEASUREMENT, // 측정 → 도형과 측정
  '04': MATH_AREAS.CHANGE_RELATIONSHIP,  // 규칙성 → 변화와 관계
  '05': MATH_AREAS.DATA_POSSIBILITY      // 자료와 가능성
}

// 2022 교육과정 영역 번호 → 영역 매핑
const CURRICULUM_2022_AREA_MAPPING: Record<string, string> = {
  '01': MATH_AREAS.NUMBER_OPERATION,     // 수와 연산
  '02': MATH_AREAS.CHANGE_RELATIONSHIP,  // 변화와 관계
  '03': MATH_AREAS.GEOMETRY_MEASUREMENT, // 도형과 측정
  '04': MATH_AREAS.DATA_POSSIBILITY      // 자료와 가능성
}

// 학년 코드 → 학년명 매핑
const GRADE_CODE_MAPPING: Record<string, string> = {
  '2': '1학년', // 1-2학년군
  '4': '3학년', // 3-4학년군
  '6': '5학년'  // 5-6학년군
}

// 성취기준 코드 정규식 패턴
// 예: [4수01-05], [2수04-01]
const ACHIEVEMENT_CODE_PATTERN = /\[(\d)수(\d{2})-(\d{2})\]/

/**
 * 성취기준 코드에서 영역 정보를 추출
 * @param achievementCode 성취기준 코드 (예: "[4수01-05]")
 * @returns 영역 매핑 정보 또는 null
 */
export function getAreaFromAchievement(achievementCode: string): AreaMapping | null {
  // 성취기준 코드 정규화
  const cleanCode = achievementCode.trim()
  const match = cleanCode.match(ACHIEVEMENT_CODE_PATTERN)

  if (!match) {
    return null
  }

  const [, gradeCode] = match

  // 학년 정보 추출
  if (!gradeCode) {
    return null
  }

  const grade = GRADE_CODE_MAPPING[gradeCode]
  if (!grade) {
    return null
  }

  // 마스터 파일에서 성취기준 찾기
  const achievementStandards = achievementStandardsData.achievement_standards

  // 2022 교육과정에서 먼저 찾기
  const standard2022 = (achievementStandards["2022"] as any)[cleanCode]
  if (standard2022) {
    return {
      area: standard2022.area,
      grade,
      curriculum: '2022'
    }
  }

  // 2015 교육과정에서 찾기
  const standard2015 = (achievementStandards["2015"] as any)[cleanCode]
  if (standard2015) {
    return {
      area: standard2015.area,
      grade,
      curriculum: '2015'
    }
  }

  return null
}

/**
 * 성취기준 배열에서 첫 번째 유효한 영역 추출
 * @param achievementStandards 성취기준 배열
 * @returns 영역명 또는 null
 */
export function extractAreaFromAchievements(achievementStandards: string[]): string | null {
  for (const standard of achievementStandards) {
    if (standard && standard.trim() !== '' && standard.trim() !== ' ') {
      // 긴 설명에서 성취기준 코드만 추출 (예: "[4수01-05] 설명..." → "[4수01-05]")
      const codeMatch = standard.match(/\[(\d)수(\d{2})-(\d{2})\]/)
      if (codeMatch) {
        const extractedCode = codeMatch[0] // "[4수01-05]" 부분만 추출
        const areaInfo = getAreaFromAchievement(extractedCode)
        if (areaInfo) {
          return areaInfo.area
        }
      }
    }
  }
  return null
}

/**
 * 모든 영역 목록 반환 (2022 통합 기준)
 * @returns 영역명 배열
 */
export function getAllAreas(): string[] {
  return Object.values(MATH_AREAS)
}

/**
 * 학년별 영역 목록 반환 (현재는 모든 학년에 모든 영역이 있음)
 * @param grade 학년
 * @returns 영역명 배열
 */
export function getAreasByGrade(grade: string): string[] {
  // 모든 학년에서 모든 영역을 다루므로 전체 영역 반환
  return getAllAreas()
}

/**
 * 영역별 색상 매핑 (UI 표시용)
 */
export const AREA_COLORS: Record<string, string> = {
  [MATH_AREAS.NUMBER_OPERATION]: 'bg-blue-100 text-blue-800',
  [MATH_AREAS.CHANGE_RELATIONSHIP]: 'bg-green-100 text-green-800',
  [MATH_AREAS.GEOMETRY_MEASUREMENT]: 'bg-purple-100 text-purple-800',
  [MATH_AREAS.DATA_POSSIBILITY]: 'bg-orange-100 text-orange-800'
}

/**
 * 영역별 아이콘 매핑 (UI 표시용)
 */
export const AREA_ICONS: Record<string, string> = {
  [MATH_AREAS.NUMBER_OPERATION]: '🔢',
  [MATH_AREAS.CHANGE_RELATIONSHIP]: '📈',
  [MATH_AREAS.GEOMETRY_MEASUREMENT]: '📐',
  [MATH_AREAS.DATA_POSSIBILITY]: '📊'
}

/**
 * 성취기준 코드에서 내용요소 정보를 추출
 * @param achievementCode 성취기준 코드 (예: "[4수01-05]")
 * @returns 내용요소 매핑 정보 또는 null
 */
export function getContentElementFromAchievement(achievementCode: string): ContentElementMapping | null {
  const cleanCode = achievementCode.trim()
  const match = cleanCode.match(ACHIEVEMENT_CODE_PATTERN)

  if (!match) {
    return null
  }

  const [, gradeCode] = match

  // 학년 정보 추출
  if (!gradeCode) {
    return null
  }

  const grade = GRADE_CODE_MAPPING[gradeCode]
  if (!grade) {
    return null
  }

  // 마스터 파일에서 성취기준 찾기
  const achievementStandards = achievementStandardsData.achievement_standards

  // 2022 교육과정에서 먼저 찾기
  const standard2022 = (achievementStandards["2022"] as any)[cleanCode]
  if (standard2022) {
    return {
      contentElement: standard2022.contentElement,
      area: standard2022.area,
      grade,
      curriculum: '2022'
    }
  }

  // 2015 교육과정에서 찾기
  const standard2015 = (achievementStandards["2015"] as any)[cleanCode]
  if (standard2015) {
    return {
      contentElement: standard2015.contentElement,
      area: standard2015.area,
      grade,
      curriculum: '2015'
    }
  }

  return null
}

/**
 * 성취기준 배열에서 첫 번째 유효한 내용요소 추출
 * @param achievementStandards 성취기준 배열
 * @returns 내용요소명 또는 null
 */
export function extractContentElementFromAchievements(achievementStandards: string[]): string | null {
  for (const standard of achievementStandards) {
    if (standard && standard.trim() !== '' && standard.trim() !== ' ') {
      // 긴 설명에서 성취기준 코드만 추출 (예: "[4수01-05] 설명..." → "[4수01-05]")
      const codeMatch = standard.match(/\[(\d)수(\d{2})-(\d{2})\]/)
      if (codeMatch) {
        const extractedCode = codeMatch[0] // "[4수01-05]" 부분만 추출
        const contentElementInfo = getContentElementFromAchievement(extractedCode)
        if (contentElementInfo) {
          return contentElementInfo.contentElement
        }
      }
    }
  }
  return null
}

/**
 * 특정 영역의 모든 내용요소 반환
 * @param area 영역명
 * @returns 내용요소명 배열
 */
export function getContentElementsByArea(area: string): string[] {
  const achievementStandards = achievementStandardsData.achievement_standards
  const contentElements = new Set<string>()

  // 2022 교육과정에서 수집
  Object.values(achievementStandards["2022"]).forEach(standard => {
    if (standard.area === area) {
      contentElements.add(standard.contentElement)
    }
  })

  // 2015 교육과정에서 수집
  Object.values(achievementStandards["2015"]).forEach(standard => {
    if (standard.area === area) {
      contentElements.add(standard.contentElement)
    }
  })

  return Array.from(contentElements).sort()
}

/**
 * 모든 내용요소 반환 (영역별로 그룹화)
 * @returns 영역별 내용요소 매핑
 */
export function getAllContentElements(): Record<string, string[]> {
  const result: Record<string, string[]> = {}

  Object.values(MATH_AREAS).forEach(area => {
    result[area] = getContentElementsByArea(area)
  })

  return result
}

// 디버깅/테스트용 함수
export function testAchievementMapping() {
  const testCodes = [
    '[4수01-05]', // 3,4학년 수와 연산
    '[2수04-01]', // 1,2학년 규칙성 → 변화와 관계
    '[6수03-01]', // 5,6학년 도형과 측정
    '[4수05-01]'  // 3,4학년 자료와 가능성
  ]

  console.log('=== 성취기준 → 영역 매핑 테스트 ===')
  testCodes.forEach(code => {
    const result = getAreaFromAchievement(code)
    console.log(`${code} → ${result ? `${result.area} (${result.grade}, ${result.curriculum})` : 'null'}`)
  })
}

export function testContentElementMapping() {
  const testCodes = [
    '[4수01-05]', // 세 자리 수 범위의 나눗셈
    '[2수01-01]', // 네 자리 이하의 수
    '[6수03-01]', // 합동과 대칭
    '[4수04-01]'  // 자료의 수집과 정리
  ]

  console.log('=== 성취기준 → 내용요소 매핑 테스트 ===')
  testCodes.forEach(code => {
    const result = getContentElementFromAchievement(code)
    console.log(`${code} → ${result ? `${result.contentElement} (${result.area}, ${result.grade}, ${result.curriculum})` : 'null'}`)
  })

  // 마스터 파일에서 실제로 존재하는 성취기준으로 테스트
  console.log('\n=== 마스터 파일 기반 테스트 ===')
  const masterStandards = achievementStandardsData.achievement_standards

  // 2022 교육과정에서 몇 개 샘플 테스트
  const sample2022 = Object.keys(masterStandards["2022"]).slice(0, 3)
  sample2022.forEach(code => {
    const result = getContentElementFromAchievement(code)
    console.log(`[2022] ${code} → ${result ? `${result.contentElement} (${result.area}, ${result.grade})` : 'null'}`)
  })

  // 2015 교육과정에서 몇 개 샘플 테스트
  const sample2015 = Object.keys(masterStandards["2015"]).slice(0, 3)
  sample2015.forEach(code => {
    const result = getContentElementFromAchievement(code)
    console.log(`[2015] ${code} → ${result ? `${result.contentElement} (${result.area}, ${result.grade})` : 'null'}`)
  })
}

// 모듈이 직접 실행될 때 테스트 함수 실행
if (require.main === module) {
  console.log('새로운 마스터 파일 구조 기반 매핑 테스트 시작...\n')
  testAchievementMapping()
  console.log('\n')
  testContentElementMapping()
}