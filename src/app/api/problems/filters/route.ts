import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import { getAllAreas, getAllContentElements } from "@/../scripts/achievement-area-mapping"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json(
        { message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    // 쿼리 파라미터에서 필터 조건 추출
    const { searchParams } = new URL(request.url)
    const selectedGrade = searchParams.get('grade')
    const selectedSemester = searchParams.get('semester')

    // 데이터베이스에서 고유한 필터 값들을 가져옵니다
    try {
      // 전체 문제 수 확인
      const totalCount = await prisma.problem.count()

      if (totalCount === 0) {
        // 데이터가 없는 경우 기본값 반환
        console.log('데이터베이스에 문제 데이터가 없습니다. 기본값을 반환합니다.')
        const defaultFilters = {
          schools: ["초등학교"],
          grades: ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"],
          semesters: ["1학기", "2학기"],
          areas: getAllAreas(),
          contentElements: getAllContentElements(),
          achievementStandards: [
            "[4수01-04] 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.",
            "[4수02-01] 분수의 의미와 표현을 이해한다.",
            "[6수02-03] 비율을 이해하고, 비율을 분수, 소수, 백분율로 나타낼 수 있다."
          ],
          totalProblems: 0
        }
        return NextResponse.json(defaultFilters)
      }

      // 동적 필터 조건 생성
      const dynamicFilter: Record<string, string> = {}
      if (selectedGrade) {
        dynamicFilter.grade = selectedGrade
      }
      if (selectedSemester) {
        dynamicFilter.semester = selectedSemester
      }

      const [schools, grades, semesters, areas, contentElements, achievementStandardsRaw] = await Promise.all([
        // 학교급별 조회
        prisma.problem.findMany({
          select: { school: true },
          where: {
            school: {
              not: null,
              notIn: ['', ' ']
            }
          },
          distinct: ['school']
        }),

        // 학년별 조회 (자연 정렬을 위해 쿼리 후 처리)
        prisma.problem.findMany({
          select: { grade: true },
          where: {
            grade: {
              notIn: ['', ' ']
            }
          },
          distinct: ['grade']
        }),

        // 학기별 조회
        prisma.problem.findMany({
          select: { semester: true },
          where: {
            semester: {
              notIn: ['', ' ']
            }
          },
          distinct: ['semester']
        }),

        // 영역별 조회 (학년/학기 필터 적용)
        prisma.problem.findMany({
          select: { area: true },
          where: {
            ...dynamicFilter,
            area: {
              not: null,
              notIn: ['', ' ']
            }
          },
          distinct: ['area']
        }),

        // 내용요소별 조회 (학년/학기 필터 적용)
        prisma.problem.findMany({
          select: { contentElement: true, area: true },
          where: {
            ...dynamicFilter,
            contentElement: {
              not: null,
              notIn: ['', ' ']
            }
          },
          distinct: ['contentElement', 'area']
        }),

        // 성취기준 조회 (학년/학기 필터 적용)
        prisma.problem.findMany({
          select: { achievementStandards: true },
          where: dynamicFilter,
          take: 100 // 샘플링
        })
      ])

      // 학년 정렬 함수 (1학년, 2학년, ... 6학년 순서)
      const sortGrades = (grades: string[]): string[] => {
        const gradeOrder = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년']
        return grades.sort((a, b) => {
          const aIndex = gradeOrder.indexOf(a)
          const bIndex = gradeOrder.indexOf(b)
          if (aIndex === -1) return 1
          if (bIndex === -1) return -1
          return aIndex - bIndex
        })
      }

      // 성취기준 추출 및 중복 제거 (새로운 2015/2022 구조 지원)
      const achievementStandards = new Set<string>()
      achievementStandardsRaw.forEach(item => {
        if (item.achievementStandards && typeof item.achievementStandards === 'object') {
          // 새로운 형태: { "2015": string[], "2022": string[] }
          const standards = item.achievementStandards as { "2015"?: string[], "2022"?: string[] }

          // 2015 교육과정 성취기준 처리
          if (Array.isArray(standards["2015"])) {
            standards["2015"].forEach(standard => {
              if (standard && typeof standard === 'string' && standard.trim() !== '' && standard.trim() !== ' ') {
                achievementStandards.add(standard.trim())
              }
            })
          }

          // 2022 교육과정 성취기준 처리
          if (Array.isArray(standards["2022"])) {
            standards["2022"].forEach(standard => {
              if (standard && typeof standard === 'string' && standard.trim() !== '' && standard.trim() !== ' ') {
                achievementStandards.add(standard.trim())
              }
            })
          }
        } else if (Array.isArray(item.achievementStandards)) {
          // 레거시 형태: string[] (호환성 유지)
          item.achievementStandards.forEach(standard => {
            if (standard && typeof standard === 'string' && standard.trim() !== '' && standard.trim() !== ' ') {
              achievementStandards.add(standard.trim())
            }
          })
        }
      })

      // 내용요소를 영역별로 그룹화 (실제 데이터 기반)
      const contentElementsByArea: Record<string, string[]> = {}
      contentElements.forEach(item => {
        if (item.area && item.contentElement) {
          if (!contentElementsByArea[item.area]) {
            contentElementsByArea[item.area] = []
          }
          if (!contentElementsByArea[item.area]!.includes(item.contentElement)) {
            contentElementsByArea[item.area]!.push(item.contentElement)
          }
        }
      })

      // 각 영역의 내용요소 정렬
      Object.keys(contentElementsByArea).forEach(area => {
        contentElementsByArea[area]!.sort()
      })

      const filters = {
        schools: schools.map(s => s.school).filter(Boolean).sort(),
        grades: sortGrades(grades.map(g => g.grade).filter(Boolean)),
        semesters: semesters.map(s => s.semester).filter(Boolean).sort(),
        areas: areas.map(a => a.area).filter(Boolean).sort(),
        contentElements: contentElementsByArea, // 실제 데이터 기반 내용요소 목록
        achievementStandards: Array.from(achievementStandards).sort(),
        totalProblems: totalCount,
        lastUpdated: new Date().toISOString(),
        appliedFilters: {
          grade: selectedGrade,
          semester: selectedSemester
        }
      }

      console.log(`필터 데이터 생성 완료:`)
      console.log(`- 학교: ${filters.schools.length}개`)
      console.log(`- 학년: ${filters.grades.length}개`)
      console.log(`- 학기: ${filters.semesters.length}개`)
      console.log(`- 영역: ${filters.areas.length}개`)
      console.log(`- 내용요소: ${Object.keys(filters.contentElements).reduce((sum, area) => sum + filters.contentElements[area]!.length, 0)}개`)
      console.log(`- 성취기준: ${filters.achievementStandards.length}개`)
      console.log(`- 총 문제 수: ${filters.totalProblems}개`)

      return NextResponse.json(filters)

    } catch (dbError) {
      console.log("데이터베이스 연결 실패, 기본값 반환:", dbError)

      // 데이터베이스에 연결할 수 없는 경우 기본값 반환
      const defaultFilters = {
        schools: ["초등학교"],
        grades: ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"],
        semesters: ["1학기", "2학기"],
        areas: getAllAreas(),
        contentElements: getAllContentElements(),
        achievementStandards: [
          "[4수01-04] 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.",
          "[4수01-05] 곱하는 수가 한 자리 수 또는 두 자리 수인 곱셈의 계산 원리를 이해하고 그 계산을 할 수 있다.",
          "[4수02-01] 분수의 의미와 표현을 이해한다.",
          "[4수03-01] 소수의 의미와 표현을 이해한다."
        ]
      }

      return NextResponse.json(defaultFilters)
    }

  } catch (error) {
    console.error("Problem filters fetch error:", error)
    return NextResponse.json(
      { message: "필터 옵션을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}