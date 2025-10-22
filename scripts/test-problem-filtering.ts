import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testProblemFiltering() {
  try {
    console.log('=== 문제 필터링 테스트 ===\n')

    // 1. 전체 문제 수
    const totalCount = await prisma.problem.count()
    console.log(`총 문제 수: ${totalCount}개`)

    // 2. 영역별 필터링 테스트
    console.log('\n=== 영역별 필터링 테스트 ===')

    const areas = ['수와 연산', '도형과 측정']
    for (const area of areas) {
      const areaProblems = await prisma.problem.findMany({
        where: { area },
        select: { sourceId: true, area: true, contentElement: true, difficulty: true },
        take: 5
      })

      console.log(`\n${area}:`)
      console.log(`  - 문제 수: ${areaProblems.length}개`)
      areaProblems.forEach(p => {
        console.log(`  - ${p.sourceId}: ${p.contentElement} (${p.difficulty})`)
      })
    }

    // 3. 내용요소별 필터링 테스트
    console.log('\n\n=== 내용요소별 필터링 테스트 ===')

    const contentElements = ['자연수의 어림셈', '세 자리 수 범위의 나눗셈', '원의 구성 요소']
    for (const contentElement of contentElements) {
      const ceProblems = await prisma.problem.findMany({
        where: { contentElement },
        select: { sourceId: true, area: true, contentElement: true, difficulty: true },
        take: 3
      })

      console.log(`\n${contentElement}:`)
      console.log(`  - 문제 수: ${ceProblems.length}개`)
      ceProblems.forEach(p => {
        console.log(`  - ${p.sourceId}: ${p.area} (${p.difficulty})`)
      })
    }

    // 4. 복합 필터링 테스트 (영역 + 난이도)
    console.log('\n\n=== 복합 필터링 테스트 (영역 + 난이도) ===')

    const combinedFilters = [
      { area: '수와 연산', difficulty: 'easy' },
      { area: '도형과 측정', difficulty: 'easy' }
    ]

    for (const filter of combinedFilters) {
      const filteredProblems = await prisma.problem.findMany({
        where: filter,
        select: { sourceId: true, area: true, contentElement: true, difficulty: true },
        take: 3
      })

      console.log(`\n${filter.area} + ${filter.difficulty}:`)
      console.log(`  - 문제 수: ${filteredProblems.length}개`)
      filteredProblems.forEach(p => {
        console.log(`  - ${p.sourceId}: ${p.contentElement}`)
      })
    }

    // 5. API 형태의 조건 시뮬레이션
    console.log('\n\n=== API 시뮬레이션 테스트 ===')

    const apiTests = [
      { area: '수와 연산', limit: 10 },
      { contentElement: '자연수의 어림셈', limit: 5 },
      { area: '수와 연산', difficulty: 'easy', limit: 5 }
    ]

    for (const apiTest of apiTests) {
      const whereConditions: Record<string, unknown> = {}

      if (apiTest.area) whereConditions.area = apiTest.area
      if ((apiTest as any).contentElement) whereConditions.contentElement = (apiTest as any).contentElement
      if ((apiTest as any).difficulty) whereConditions.difficulty = (apiTest as any).difficulty

      const results = await prisma.problem.findMany({
        where: whereConditions,
        take: apiTest.limit,
        select: { sourceId: true, area: true, contentElement: true, difficulty: true },
        orderBy: { createdAt: 'desc' }
      })

      console.log(`\nAPI 테스트 - ${JSON.stringify(apiTest)}:`)
      console.log(`  - 결과: ${results.length}개`)
      results.slice(0, 2).forEach(r => {
        console.log(`  - ${r.sourceId}: ${r.area} > ${r.contentElement} (${r.difficulty})`)
      })
    }

    console.log('\n=== 필터링 테스트 완료 ===')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testProblemFiltering()