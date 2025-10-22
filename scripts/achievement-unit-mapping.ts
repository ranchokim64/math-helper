// 성취기준 코드를 단원명으로 매핑하는 테이블
// 2015 개정 교육과정과 2022 개정 교육과정의 성취기준을 포함

interface UnitMapping {
  unit: string
  subUnit?: string
  grade: string
  semester: string
}

// 초등학교 성취기준 매핑
export const elementaryAchievementMapping: Record<string, UnitMapping> = {
  // 1학년
  "[2수01-01]": { unit: "수와 연산", subUnit: "9까지의 수", grade: "1학년", semester: "1학기" },
  "[2수01-02]": { unit: "수와 연산", subUnit: "9까지의 수", grade: "1학년", semester: "1학기" },
  "[2수01-03]": { unit: "수와 연산", subUnit: "덧셈과 뺄셈", grade: "1학년", semester: "1학기" },

  // 2학년
  "[2수01-04]": { unit: "수와 연산", subUnit: "100까지의 수", grade: "2학년", semester: "1학기" },
  "[2수01-05]": { unit: "수와 연산", subUnit: "덧셈과 뺄셈", grade: "2학년", semester: "1학기" },
  "[2수02-01]": { unit: "도형과 측정", subUnit: "시각과 시간", grade: "2학년", semester: "1학기" },

  // 3학년
  "[4수01-01]": { unit: "수와 연산", subUnit: "1000까지의 수", grade: "3학년", semester: "1학기" },
  "[4수01-02]": { unit: "수와 연산", subUnit: "덧셈과 뺄셈", grade: "3학년", semester: "1학기" },
  "[4수01-03]": { unit: "수와 연산", subUnit: "곱셈", grade: "3학년", semester: "1학기" },
  "[4수02-01]": { unit: "도형과 측정", subUnit: "길이와 시간", grade: "3학년", semester: "1학기" },
  "[4수03-01]": { unit: "자료와 가능성", subUnit: "표와 그래프", grade: "3학년", semester: "1학기" },

  // 4학년
  "[4수01-04]": { unit: "수와 연산", subUnit: "곱셈", grade: "4학년", semester: "1학기" },
  "[4수01-05]": { unit: "수와 연산", subUnit: "나눗셈", grade: "4학년", semester: "1학기" },
  "[4수02-02]": { unit: "수와 연산", subUnit: "분수", grade: "4학년", semester: "1학기" },
  "[4수03-02]": { unit: "수와 연산", subUnit: "소수", grade: "4학년", semester: "2학기" },
  "[4수04-01]": { unit: "도형과 측정", subUnit: "각도", grade: "4학년", semester: "2학기" },
  "[4수04-02]": { unit: "도형과 측정", subUnit: "삼각형", grade: "4학년", semester: "2학기" },

  // 5학년
  "[6수01-01]": { unit: "수와 연산", subUnit: "자연수의 혼합 계산", grade: "5학년", semester: "1학기" },
  "[6수01-02]": { unit: "수와 연산", subUnit: "약수와 배수", grade: "5학년", semester: "1학기" },
  "[6수01-03]": { unit: "수와 연산", subUnit: "약분과 통분", grade: "5학년", semester: "1학기" },
  "[6수02-01]": { unit: "도형과 측정", subUnit: "직육면체", grade: "5학년", semester: "1학기" },
  "[6수03-01]": { unit: "규칙과 대응", subUnit: "규칙과 대응", grade: "5학년", semester: "1학기" },
  "[6수04-01]": { unit: "자료와 가능성", subUnit: "가능성", grade: "5학년", semester: "2학기" },

  // 6학년
  "[6수01-04]": { unit: "수와 연산", subUnit: "분수의 나눗셈", grade: "6학년", semester: "1학기" },
  "[6수02-02]": { unit: "수와 연산", subUnit: "소수의 나눗셈", grade: "6학년", semester: "1학기" },
  "[6수02-03]": { unit: "비와 비율", subUnit: "비와 비율", grade: "6학년", semester: "1학기" },
  "[6수02-04]": { unit: "비와 비율", subUnit: "비와 비율", grade: "6학년", semester: "1학기" },
  "[6수03-03]": { unit: "도형과 측정", subUnit: "원의 넓이", grade: "6학년", semester: "1학기" },
  "[6수03-04]": { unit: "도형과 측정", subUnit: "원기둥", grade: "6학년", semester: "2학기" },
  "[6수04-05]": { unit: "규칙과 대응", subUnit: "정비례", grade: "6학년", semester: "2학기" },
  "[6수04-06]": { unit: "자료와 가능성", subUnit: "자료의 정리", grade: "6학년", semester: "2학기" },
}


// 통합 매핑 함수 (초등학교만 지원)
export function getUnitFromAchievement(achievementCode: string): UnitMapping | null {
  // 성취기준 코드에서 대괄호 제거하고 정규화
  const cleanCode = achievementCode.replace(/[\[\]]/g, '').trim()
  const normalizedCode = `[${cleanCode}]`

  // 초등학교 매핑 확인
  if (elementaryAchievementMapping[normalizedCode]) {
    return elementaryAchievementMapping[normalizedCode]
  }

  return null
}

// 모든 단원명 목록 가져오기 (초등학교만)
export function getAllUnits(): string[] {
  const units = new Set<string>()
  Object.values(elementaryAchievementMapping).forEach(mapping => {
    units.add(mapping.unit)
  })

  return Array.from(units).sort()
}

// 학교급별 단원명 목록 가져오기 (초등학교만 지원)
export function getUnitsBySchool(school: string): string[] {
  if (school !== '초등학교') {
    return []
  }

  const units = new Set<string>()
  Object.values(elementaryAchievementMapping).forEach(mapping => {
    units.add(mapping.unit)
  })

  return Array.from(units).sort()
}

// 학년별 단원명 목록 가져오기 (초등학교만 지원)
export function getUnitsByGrade(school: string, grade: string): string[] {
  if (school !== '초등학교') {
    return []
  }

  const units = new Set<string>()
  Object.values(elementaryAchievementMapping).forEach(mapping => {
    if (mapping.grade === grade) {
      units.add(mapping.unit)
    }
  })

  return Array.from(units).sort()
}